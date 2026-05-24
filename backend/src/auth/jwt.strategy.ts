import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  nickname: string;
  role?: 'USER' | 'ADMIN';
}

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  // userId → 마지막 last_seen_at 갱신 시각 (단일 인스턴스 가드)
  private readonly recentTouches = new Map<string, number>();

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    void this.touchLastSeen(payload.sub);
    return {
      userId: payload.sub,
      nickname: payload.nickname,
      role: payload.role,
    };
  }

  // 비동기로 last_seen_at 갱신. 결과를 기다리지 않음 — 요청 응답 지연 0.
  // 1차: 인메모리 Map으로 같은 인스턴스에서 5분 내 중복 호출 차단
  // 2차: raw SQL의 WHERE 절로 다른 인스턴스에서 온 동시 갱신도 차단
  //      updatedAt 트리거를 건드리지 않기 위해 prisma.user.update가 아닌 raw SQL 사용
  private async touchLastSeen(userId: string): Promise<void> {
    const now = Date.now();
    const last = this.recentTouches.get(userId);
    if (last && now - last < LAST_SEEN_THROTTLE_MS) return;
    this.recentTouches.set(userId, now);

    try {
      await this.prisma.$executeRaw`
        UPDATE users
        SET last_seen_at = NOW()
        WHERE id = ${BigInt(userId)}
          AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes')
      `;
    } catch (err) {
      // 인증 자체는 통과시키되, 메트릭 갱신 실패는 로그만 남김
      this.logger.warn(`last_seen_at 갱신 실패 (user=${userId})`, err);
    }
  }
}
