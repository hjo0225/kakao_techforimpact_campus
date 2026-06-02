import {
  BadRequestException,
  Body,
  Controller,
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
import { AnalyzeDto, ConfirmDto } from './dto/verify.dto';
import { UploadedImage, VerifyService } from './verify.service';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('verify')
@UseGuards(JwtAuthGuard)
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  // 1단계: 이미지 업로드 → GCS 적재 + Vision 예측 → PENDING 샘플 반환
  @Post('analyze')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async analyze(
    @Request() req: AuthedRequest,
    @UploadedFile() image: UploadedImage,
    @Body() body: AnalyzeDto,
  ) {
    if (!image)
      throw new BadRequestException('multipart "image" 필드가 필요합니다');
    return this.verifyService.analyze(req.user.userId, body.kind, image, {
      gameId: body.gameId,
      lat: body.lat,
      lng: body.lng,
    });
  }

  // 2단계: 유저가 정답 라벨 확정 → REUSABLE이면 점수 부여
  @Post('confirm')
  @HttpCode(200)
  async confirm(@Request() req: AuthedRequest, @Body() body: ConfirmDto) {
    return this.verifyService.confirm(
      req.user.userId,
      body.sampleId,
      body.userLabel,
    );
  }

  // 캘린더용 — 본인 인증 이력 (최신순)
  @Get('history')
  async history(@Request() req: AuthedRequest) {
    return this.verifyService.getHistory(req.user.userId);
  }

  // 캘린더용 — 본인 샘플 이미지 스트리밍 (프론트는 bearer로 fetch → blob URL)
  @Get('history/:id/image')
  async historyImage(
    @Request() req: AuthedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.verifyService.getImage(
      req.user.userId,
      id,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  }
}
