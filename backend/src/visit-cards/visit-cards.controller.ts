import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadInput } from '../storage/storage.service';
import { CreateVisitCardDto } from './dto/create-visit-card.dto';
import { VisitCardsService } from './visit-cards.service';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('visit-cards')
@UseGuards(JwtAuthGuard)
export class VisitCardsController {
  constructor(private readonly visitCards: VisitCardsService) {}

  // 직관카드 저장 (이미지 + 메타) → 공유 토큰 반환
  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async create(
    @Request() req: AuthedRequest,
    @UploadedFile() image: UploadInput,
    @Body() body: CreateVisitCardDto,
  ) {
    if (!image)
      throw new BadRequestException('multipart "image" 필드가 필요합니다');
    return this.visitCards.create(req.user.userId, image, body);
  }

  @Get()
  async list(@Request() req: AuthedRequest) {
    return this.visitCards.listMine(req.user.userId);
  }

  @Get(':id/image')
  async image(
    @Request() req: AuthedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.visitCards.getOwnImage(
      req.user.userId,
      id,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Request() req: AuthedRequest, @Param('id') id: string) {
    await this.visitCards.remove(req.user.userId, id);
  }
}
