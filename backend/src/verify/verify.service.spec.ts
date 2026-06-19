import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { VerifyService } from './verify.service';

const UsageKind = { USE: 'USE' } as const;
const ContainerLabel = {
  REUSABLE: 'REUSABLE',
  SINGLE_USE: 'SINGLE_USE',
} as const;

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

type AnyFn = jest.Mock<unknown, unknown[]>;
interface PrismaStub {
  usage: { create: AnyFn };
  verificationSample: { create: AnyFn; findUnique: AnyFn; update: AnyFn };
}

function mockImage() {
  return {
    buffer: Buffer.from([0xff, 0xd8]),
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
  };
}

describe('VerifyService', () => {
  let service: VerifyService;
  let prisma: PrismaStub;
  let storage: { uploadVerificationImage: AnyFn };

  beforeEach(async () => {
    prisma = {
      usage: { create: jest.fn() },
      verificationSample: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    storage = {
      uploadVerificationImage: jest.fn().mockResolvedValue({
        path: 'gs://bucket/verify/1/abc.jpg',
        hash: 'abc',
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        VerifyService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('https://vision.example.com'),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    service = moduleRef.get(VerifyService);
    jest.clearAllMocks();
    storage.uploadVerificationImage.mockResolvedValue({
      path: 'gs://bucket/verify/1/abc.jpg',
      hash: 'abc',
    });
  });

  describe('analyze', () => {
    it('정상 — 이미지 적재 + AI 예측을 PENDING 샘플로 저장', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: true, classIndex: 0, confidence: 92.5 },
      });
      prisma.verificationSample.create.mockResolvedValue({ id: 10n });

      const out = await service.analyze('1', UsageKind.USE, mockImage(), {
        gameId: '42',
        lat: 37.512,
        lng: 127.071,
      });

      expect(storage.uploadVerificationImage).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ mimetype: 'image/jpeg' }),
      );
      expect(out.sampleId).toBe('10');
      expect(out.ai?.confidence).toBe(92.5);
      expect(out.suggestedLabel).toBe(ContainerLabel.REUSABLE);
      expect(prisma.verificationSample.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          imagePath: 'gs://bucket/verify/1/abc.jpg',
          imageHash: 'abc',
          aiIsReusable: true,
          aiConfidence: 92.5,
          gameId: 42n,
          lat: 37.512,
          lng: 127.071,
        }),
      });
    });

    it('Vision 다운 — ai=null로도 샘플은 적재', async () => {
      mockedAxios.post.mockRejectedValue(new Error('vision down'));
      prisma.verificationSample.create.mockResolvedValue({ id: 11n });

      const out = await service.analyze('1', UsageKind.USE, mockImage(), {});

      expect(out.ai).toBeNull();
      expect(out.suggestedLabel).toBe(ContainerLabel.REUSABLE);
      expect(prisma.verificationSample.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          aiIsReusable: null,
          aiConfidence: null,
        }),
      });
    });

    it('AI가 일회용기로 보면 suggestedLabel=SINGLE_USE', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: false, classIndex: 1, confidence: 88 },
      });
      prisma.verificationSample.create.mockResolvedValue({ id: 12n });

      const out = await service.analyze('1', UsageKind.USE, mockImage(), {});

      expect(out.suggestedLabel).toBe(ContainerLabel.SINGLE_USE);
    });
  });

  describe('confirm', () => {
    function pendingSample(over: Record<string, unknown> = {}) {
      return {
        id: 10n,
        userId: 1n,
        kind: UsageKind.USE,
        status: 'PENDING',
        aiConfidence: 92.5,
        gameId: null,
        lat: null,
        lng: null,
        ...over,
      };
    }

    it('REUSABLE(USE) — usage 점수 50 생성 + 샘플 연결', async () => {
      prisma.verificationSample.findUnique.mockResolvedValue(pendingSample());
      prisma.usage.create.mockResolvedValue({
        id: 5n,
        kind: UsageKind.USE,
        score: 50,
        scannedAt: new Date('2026-06-01T10:00:00Z'),
      });
      prisma.verificationSample.update.mockResolvedValue({});

      const out = await service.confirm('1', '10', ContainerLabel.REUSABLE);

      expect(out.scored).toBe(true);
      expect(out.usage?.score).toBe(50);
      expect(prisma.usage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kind: UsageKind.USE, score: 50 }),
      });
      expect(prisma.verificationSample.update).toHaveBeenCalledWith({
        where: { id: 10n },
        data: expect.objectContaining({
          userLabel: ContainerLabel.REUSABLE,
          status: 'CONFIRMED',
          usageId: 5n,
        }),
      });
    });

    it('SINGLE_USE — 점수 없이 음성 샘플로 확정', async () => {
      prisma.verificationSample.findUnique.mockResolvedValue(pendingSample());
      prisma.verificationSample.update.mockResolvedValue({});

      const out = await service.confirm('1', '10', ContainerLabel.SINGLE_USE);

      expect(out.scored).toBe(false);
      expect(out.reason).toBe('SINGLE_USE_LABEL');
      expect(prisma.usage.create).not.toHaveBeenCalled();
    });

    it('타인 샘플 — Forbidden', async () => {
      prisma.verificationSample.findUnique.mockResolvedValue(
        pendingSample({ userId: 999n }),
      );
      await expect(
        service.confirm('1', '10', ContainerLabel.REUSABLE),
      ).rejects.toThrow(ForbiddenException);
    });

    it('이미 확정된 샘플 — Conflict', async () => {
      prisma.verificationSample.findUnique.mockResolvedValue(
        pendingSample({ status: 'CONFIRMED' }),
      );
      await expect(
        service.confirm('1', '10', ContainerLabel.REUSABLE),
      ).rejects.toThrow(ConflictException);
    });

    it('없는 샘플 — NotFound', async () => {
      prisma.verificationSample.findUnique.mockResolvedValue(null);
      await expect(
        service.confirm('1', '10', ContainerLabel.REUSABLE),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
