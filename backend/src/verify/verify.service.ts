import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsageKind } from '@prisma/client'
import axios, { AxiosError } from 'axios'
import FormData from 'form-data'
import { PrismaService } from '../prisma/prisma.service'

export interface ReusableVerifyResult {
  isReusable: boolean
  classIndex: number
  confidence: number
}

export interface UploadedImage {
  buffer: Buffer
  originalname: string
  mimetype: string
}

export interface VerifyMeta {
  gameId?: string
  lat?: number
  lng?: number
}

export interface VerifyOutcome {
  vision: ReusableVerifyResult
  usage: {
    id: string
    kind: UsageKind
    score: number
    scannedAt: Date
  }
}

const CONFIDENCE_THRESHOLD = 70   // % — 미만이면 검증 실패
const SCORE_USE = 50
const SCORE_RETURN = 100
const RETURN_WINDOW_HOURS = 12

@Injectable()
export class VerifyService {
  private readonly logger = new Logger(VerifyService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyAndRecord(
    userId: string,
    kind: UsageKind,
    image: UploadedImage,
    meta: VerifyMeta,
  ): Promise<VerifyOutcome> {
    if (kind === UsageKind.RETURN) {
      await this.assertRecentUse(userId)
    }

    const vision = await this.callVision(image)
    if (!vision.isReusable) {
      throw new BadRequestException({
        code: 'NOT_REUSABLE',
        message: '다회용기로 판별되지 않았습니다',
        vision,
      })
    }
    if (vision.confidence < CONFIDENCE_THRESHOLD) {
      throw new BadRequestException({
        code: 'LOW_CONFIDENCE',
        message: `confidence ${vision.confidence.toFixed(2)}% < ${CONFIDENCE_THRESHOLD}%`,
        vision,
      })
    }

    const score = kind === UsageKind.RETURN ? SCORE_RETURN : SCORE_USE
    const usage = await this.prisma.usage.create({
      data: {
        userId: BigInt(userId),
        kind,
        score,
        confidence: vision.confidence,
        gameId: meta.gameId ? BigInt(meta.gameId) : null,
        lat: meta.lat ?? null,
        lng: meta.lng ?? null,
      },
    })

    return {
      vision,
      usage: {
        id: usage.id.toString(),
        kind: usage.kind,
        score: usage.score,
        scannedAt: usage.scannedAt,
      },
    }
  }

  private async assertRecentUse(userId: string): Promise<void> {
    const cutoff = new Date(Date.now() - RETURN_WINDOW_HOURS * 60 * 60 * 1000)
    const recentUse = await this.prisma.usage.findFirst({
      where: {
        userId: BigInt(userId),
        kind: UsageKind.USE,
        scannedAt: { gte: cutoff },
      },
      orderBy: { scannedAt: 'desc' },
    })
    if (!recentUse) {
      throw new ConflictException({
        code: 'NO_RECENT_USE',
        message: `최근 ${RETURN_WINDOW_HOURS}시간 내 사용 인증 기록이 없습니다`,
      })
    }
  }

  private async callVision(image: UploadedImage): Promise<ReusableVerifyResult> {
    const visionUrl = this.config.getOrThrow<string>('VISION_API_URL')
    const form = new FormData()
    form.append('image', image.buffer, {
      filename: image.originalname || 'upload.jpg',
      contentType: image.mimetype,
    })

    try {
      const { data } = await axios.post<ReusableVerifyResult>(
        `${visionUrl}/verify-reusable`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 30_000,
          maxContentLength: 20 * 1024 * 1024,
        },
      )
      return data
    } catch (err) {
      if (err instanceof AxiosError && err.response) {
        throw new HttpException(err.response.data, err.response.status)
      }
      this.logger.error('vision API 호출 실패', err)
      throw new ServiceUnavailableException('vision 서비스 호출 실패')
    }
  }
}
