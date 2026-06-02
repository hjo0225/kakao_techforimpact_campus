import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { VisitCardsService } from './visit-cards.service';

// 공개 공유 — 인증 불필요. 토큰은 추측 불가능한 랜덤값.
@Controller('share/visit-cards')
export class VisitCardShareController {
  constructor(private readonly visitCards: VisitCardsService) {}

  @Get(':token')
  async meta(@Param('token') token: string) {
    return this.visitCards.getByToken(token);
  }

  @Get(':token/image')
  async image(@Param('token') token: string, @Res() res: Response) {
    const { buffer, contentType } = await this.visitCards.getImageByToken(token);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }
}
