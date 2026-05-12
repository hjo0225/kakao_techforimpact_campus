import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UsageKind } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyService } from './verify.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

type AnyFn = jest.Mock<unknown, unknown[]>;
interface PrismaStub {
  usage: { create: AnyFn; findFirst: AnyFn };
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

  beforeEach(async () => {
    prisma = {
      usage: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
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
      ],
    }).compile();
    service = moduleRef.get(VerifyService);
    jest.clearAllMocks();
  });

  describe('USE', () => {
    it('정상 — Usage row 생성 + score 50 반환', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: true, classIndex: 0, confidence: 92.5 },
      });
      prisma.usage.create.mockResolvedValue({
        id: 1n,
        kind: UsageKind.USE,
        score: 50,
        scannedAt: new Date('2026-05-12T10:00:00Z'),
      });

      const out = await service.verifyAndRecord(
        '1',
        UsageKind.USE,
        mockImage(),
        {},
      );

      expect(out.vision.confidence).toBe(92.5);
      expect(out.usage.kind).toBe(UsageKind.USE);
      expect(out.usage.score).toBe(50);
      expect(prisma.usage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kind: UsageKind.USE, score: 50 }),
      });
    });

    it('confidence < 70 → BadRequest + 적재 안 함', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: true, classIndex: 0, confidence: 65 },
      });

      await expect(
        service.verifyAndRecord('1', UsageKind.USE, mockImage(), {}),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.usage.create).not.toHaveBeenCalled();
    });

    it('isReusable === false → BadRequest + 적재 안 함', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: false, classIndex: 1, confidence: 95 },
      });

      await expect(
        service.verifyAndRecord('1', UsageKind.USE, mockImage(), {}),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.usage.create).not.toHaveBeenCalled();
    });

    it('meta(gameId/lat/lng) 모두 적재', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: true, classIndex: 0, confidence: 88 },
      });
      prisma.usage.create.mockResolvedValue({
        id: 1n,
        kind: UsageKind.USE,
        score: 50,
        scannedAt: new Date(),
      });

      await service.verifyAndRecord('1', UsageKind.USE, mockImage(), {
        gameId: '42',
        lat: 37.512,
        lng: 127.071,
      });

      expect(prisma.usage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gameId: 42n,
          lat: 37.512,
          lng: 127.071,
        }),
      });
    });
  });

  describe('RETURN', () => {
    it('직전 USE 없음 → Conflict + vision 호출 안 함', async () => {
      prisma.usage.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyAndRecord('1', UsageKind.RETURN, mockImage(), {}),
      ).rejects.toThrow(ConflictException);
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(prisma.usage.create).not.toHaveBeenCalled();
    });

    it('정상 — 12시간 내 USE 있음 → score 100', async () => {
      prisma.usage.findFirst.mockResolvedValue({
        id: 1n,
        kind: UsageKind.USE,
        scannedAt: new Date(Date.now() - 30 * 60 * 1000), // 30분 전
      });
      mockedAxios.post.mockResolvedValue({
        data: { isReusable: true, classIndex: 0, confidence: 90 },
      });
      prisma.usage.create.mockResolvedValue({
        id: 2n,
        kind: UsageKind.RETURN,
        score: 100,
        scannedAt: new Date(),
      });

      const out = await service.verifyAndRecord(
        '1',
        UsageKind.RETURN,
        mockImage(),
        {},
      );

      expect(out.usage.score).toBe(100);
      expect(out.usage.kind).toBe(UsageKind.RETURN);
    });

    it('findFirst가 cutoff 필터를 사용 (12시간 boundary)', async () => {
      prisma.usage.findFirst.mockResolvedValue(null);
      const before = Date.now();

      await service
        .verifyAndRecord('1', UsageKind.RETURN, mockImage(), {})
        .catch(() => undefined);

      const call = prisma.usage.findFirst.mock.calls[0][0] as {
        where: { scannedAt: { gte: Date } };
      };
      const cutoff = call.where.scannedAt.gte.getTime();
      const expected = before - 12 * 60 * 60 * 1000;
      // ±1초 오차 허용
      expect(Math.abs(cutoff - expected)).toBeLessThan(1000);
    });
  });
});
