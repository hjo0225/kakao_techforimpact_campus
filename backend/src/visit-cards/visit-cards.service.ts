import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadInput } from '../storage/storage.service';

interface CreateMeta {
  caption?: string;
  teamCode?: string;
}

@Injectable()
export class VisitCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, image: UploadInput, meta: CreateMeta) {
    const { path, hash } = await this.storage.uploadVisitCardImage(
      userId,
      image,
    );
    const shareToken = randomBytes(12).toString('hex');
    const card = await this.prisma.visitCard.create({
      data: {
        userId: BigInt(userId),
        imagePath: path,
        imageHash: hash,
        caption: meta.caption ?? null,
        teamCode: meta.teamCode ?? null,
        shareToken,
      },
    });
    return {
      id: card.id.toString(),
      shareToken: card.shareToken,
      createdAt: card.createdAt.toISOString(),
    };
  }

  async listMine(userId: string) {
    const cards = await this.prisma.visitCard.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return cards.map((c) => ({
      id: c.id.toString(),
      caption: c.caption,
      teamCode: c.teamCode,
      shareToken: c.shareToken,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async getOwnImage(userId: string, id: string) {
    const card = await this.prisma.visitCard.findUnique({
      where: { id: BigInt(id) },
      select: { userId: true, imagePath: true },
    });
    if (!card) {
      throw new NotFoundException({
        code: 'CARD_NOT_FOUND',
        message: '직관카드를 찾을 수 없습니다',
      });
    }
    if (card.userId !== BigInt(userId)) {
      throw new ForbiddenException({
        code: 'NOT_OWNER',
        message: '본인의 직관카드만 볼 수 있습니다',
      });
    }
    return this.storage.downloadImage(card.imagePath);
  }

  async remove(userId: string, id: string) {
    const card = await this.prisma.visitCard.findUnique({
      where: { id: BigInt(id) },
      select: { userId: true },
    });
    if (!card) {
      throw new NotFoundException({
        code: 'CARD_NOT_FOUND',
        message: '직관카드를 찾을 수 없습니다',
      });
    }
    if (card.userId !== BigInt(userId)) {
      throw new ForbiddenException({
        code: 'NOT_OWNER',
        message: '본인의 직관카드만 삭제할 수 있습니다',
      });
    }
    await this.prisma.visitCard.delete({ where: { id: BigInt(id) } });
  }

  // --- 공개 (공유 링크, 인증 불필요) ---
  async getByToken(token: string) {
    const card = await this.prisma.visitCard.findUnique({
      where: { shareToken: token },
      select: { caption: true, teamCode: true, createdAt: true },
    });
    if (!card) {
      throw new NotFoundException({
        code: 'CARD_NOT_FOUND',
        message: '직관카드를 찾을 수 없습니다',
      });
    }
    return {
      caption: card.caption,
      teamCode: card.teamCode,
      createdAt: card.createdAt.toISOString(),
    };
  }

  async getImageByToken(token: string) {
    const card = await this.prisma.visitCard.findUnique({
      where: { shareToken: token },
      select: { imagePath: true },
    });
    if (!card) {
      throw new NotFoundException({
        code: 'CARD_NOT_FOUND',
        message: '직관카드를 찾을 수 없습니다',
      });
    }
    return this.storage.downloadImage(card.imagePath);
  }
}
