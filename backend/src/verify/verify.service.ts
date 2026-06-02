import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const UsageKind = {
  USE: 'USE',
  RETURN: 'RETURN',
} as const;
type UsageKind = (typeof UsageKind)[keyof typeof UsageKind];

const ContainerLabel = {
  REUSABLE: 'REUSABLE',
  SINGLE_USE: 'SINGLE_USE',
} as const;
type ContainerLabel = (typeof ContainerLabel)[keyof typeof ContainerLabel];

export interface ReusableVerifyResult {
  isReusable: boolean;
  classIndex: number;
  confidence: number;
}

export interface UploadedImage {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface VerifyMeta {
  gameId?: string;
  lat?: number;
  lng?: number;
}

export interface AnalyzeOutcome {
  sampleId: string;
  /** Vision 예측. 서비스 다운 시 null (그래도 샘플은 적재됨). */
  ai: ReusableVerifyResult | null;
  /** AI가 제안하는 라벨 — UI 기본 선택값. AI 다운 시 REUSABLE. */
  suggestedLabel: ContainerLabel;
}

export interface ConfirmOutcome {
  sample: {
    id: string;
    kind: UsageKind;
    userLabel: ContainerLabel;
    status: 'CONFIRMED';
  };
  scored: boolean;
  reason?: 'SINGLE_USE_LABEL' | 'NO_RECENT_USE';
  usage?: {
    id: string;
    kind: UsageKind;
    score: number;
    scannedAt: Date;
  };
}

const SCORE_USE = 50;
const SCORE_RETURN = 100;
const RETURN_WINDOW_HOURS = 12;

@Injectable()
export class VerifyService {
  private readonly logger = new Logger(VerifyService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 1단계: 이미지를 GCS에 적재하고 Vision 예측을 받아 PENDING 샘플을 만든다.
   * 어떤 판별 결과든 학습용으로 항상 저장한다 (Vision 다운이어도 적재).
   */
  async analyze(
    userId: string,
    kind: UsageKind,
    image: UploadedImage,
    meta: VerifyMeta,
  ): Promise<AnalyzeOutcome> {
    const { path, hash } = await this.storage.uploadVerificationImage(
      userId,
      image,
    );
    const ai = await this.callVision(image);

    const sample = await this.prisma.verificationSample.create({
      data: {
        userId: BigInt(userId),
        kind,
        imagePath: path,
        imageHash: hash,
        aiIsReusable: ai?.isReusable ?? null,
        aiClassIndex: ai?.classIndex ?? null,
        aiConfidence: ai?.confidence ?? null,
        gameId: meta.gameId ? BigInt(meta.gameId) : null,
        lat: meta.lat ?? null,
        lng: meta.lng ?? null,
      },
    });

    return {
      sampleId: sample.id.toString(),
      ai,
      suggestedLabel:
        ai && !ai.isReusable
          ? ContainerLabel.SINGLE_USE
          : ContainerLabel.REUSABLE,
    };
  }

  /**
   * 2단계: 유저가 정답 라벨을 확정한다. 라벨이 REUSABLE이면 점수 행(usages)을 만든다.
   * 모든 시도는 이미 1단계에서 적재되어 있으므로 SINGLE_USE도 음성 샘플로 남는다.
   */
  async confirm(
    userId: string,
    sampleId: string,
    userLabel: ContainerLabel,
  ): Promise<ConfirmOutcome> {
    const sample = await this.prisma.verificationSample.findUnique({
      where: { id: BigInt(sampleId) },
    });
    if (!sample) {
      throw new NotFoundException({
        code: 'SAMPLE_NOT_FOUND',
        message: '인증 샘플을 찾을 수 없습니다',
      });
    }
    if (sample.userId !== BigInt(userId)) {
      throw new ForbiddenException({
        code: 'NOT_OWNER',
        message: '본인의 인증 샘플만 확정할 수 있습니다',
      });
    }
    if (sample.status !== 'PENDING') {
      throw new ConflictException({
        code: 'ALREADY_CONFIRMED',
        message: '이미 라벨이 확정된 샘플입니다',
      });
    }

    const kind = sample.kind;

    // 일회용기 라벨 → 점수 없음, 음성 샘플로만 확정
    if (userLabel === ContainerLabel.SINGLE_USE) {
      await this.prisma.verificationSample.update({
        where: { id: sample.id },
        data: { userLabel, status: 'CONFIRMED', confirmedAt: new Date() },
      });
      return {
        sample: { id: sampleId, kind, userLabel, status: 'CONFIRMED' },
        scored: false,
        reason: 'SINGLE_USE_LABEL',
      };
    }

    // RETURN 점수는 직전 12시간 내 USE가 있어야 부여 (위반 시 샘플은 확정하되 미점수)
    if (kind === UsageKind.RETURN && !(await this.hasRecentUse(userId))) {
      await this.prisma.verificationSample.update({
        where: { id: sample.id },
        data: { userLabel, status: 'CONFIRMED', confirmedAt: new Date() },
      });
      return {
        sample: { id: sampleId, kind, userLabel, status: 'CONFIRMED' },
        scored: false,
        reason: 'NO_RECENT_USE',
      };
    }

    const score = kind === UsageKind.RETURN ? SCORE_RETURN : SCORE_USE;
    const usage = await this.prisma.usage.create({
      data: {
        userId: BigInt(userId),
        kind,
        score,
        confidence: sample.aiConfidence,
        gameId: sample.gameId,
        lat: sample.lat,
        lng: sample.lng,
      },
    });
    await this.prisma.verificationSample.update({
      where: { id: sample.id },
      data: {
        userLabel,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        usageId: usage.id,
      },
    });

    return {
      sample: { id: sampleId, kind, userLabel, status: 'CONFIRMED' },
      scored: true,
      usage: {
        id: usage.id.toString(),
        kind: usage.kind,
        score: usage.score,
        scannedAt: usage.scannedAt,
      },
    };
  }

  /** 캘린더용 — 유저의 인증 시도 이력 (최신순, 이미지 메타 포함). */
  async getHistory(userId: string) {
    const samples = await this.prisma.verificationSample.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        kind: true,
        userLabel: true,
        status: true,
        aiConfidence: true,
        createdAt: true,
      },
    });
    return samples.map((s) => ({
      id: s.id.toString(),
      kind: s.kind,
      userLabel: s.userLabel,
      status: s.status,
      confidence: s.aiConfidence,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  /** 캘린더용 — 본인 샘플의 GCS 이미지 바이트. */
  async getImage(
    userId: string,
    sampleId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const sample = await this.prisma.verificationSample.findUnique({
      where: { id: BigInt(sampleId) },
      select: { userId: true, imagePath: true },
    });
    if (!sample) {
      throw new NotFoundException({
        code: 'SAMPLE_NOT_FOUND',
        message: '인증 샘플을 찾을 수 없습니다',
      });
    }
    if (sample.userId !== BigInt(userId)) {
      throw new ForbiddenException({
        code: 'NOT_OWNER',
        message: '본인의 인증 이미지만 볼 수 있습니다',
      });
    }
    return this.storage.downloadVerificationImage(sample.imagePath);
  }

  private async hasRecentUse(userId: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - RETURN_WINDOW_HOURS * 60 * 60 * 1000);
    const recentUse = await this.prisma.usage.findFirst({
      where: {
        userId: BigInt(userId),
        kind: UsageKind.USE,
        scannedAt: { gte: cutoff },
      },
      orderBy: { scannedAt: 'desc' },
    });
    return recentUse !== null;
  }

  /**
   * Vision Cloud Run 호출. 학습 데이터 적재를 막지 않도록 실패해도 throw하지 않고 null 반환.
   */
  private async callVision(
    image: UploadedImage,
  ): Promise<ReusableVerifyResult | null> {
    const visionUrl = this.config.getOrThrow<string>('VISION_API_URL');
    const form = new FormData();
    form.append('image', image.buffer, {
      filename: image.originalname || 'upload.jpg',
      contentType: image.mimetype,
    });

    try {
      const { data } = await axios.post<ReusableVerifyResult>(
        `${visionUrl}/verify-reusable`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 30_000,
          maxContentLength: 20 * 1024 * 1024,
        },
      );
      return data;
    } catch (err) {
      this.logger.warn('vision API 호출 실패 — ai=null로 적재 진행', err);
      return null;
    }
  }
}
