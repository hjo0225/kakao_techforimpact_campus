import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsageKind } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifyDto } from './dto/verify.dto';
import { UploadedImage, VerifyService } from './verify.service';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('verify')
@UseGuards(JwtAuthGuard)
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('use')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async verifyUse(
    @Request() req: AuthedRequest,
    @UploadedFile() image: UploadedImage,
    @Body() body: VerifyDto,
  ) {
    if (!image)
      throw new BadRequestException('multipart "image" 필드가 필요합니다');
    return this.verifyService.verifyAndRecord(
      req.user.userId,
      UsageKind.USE,
      image,
      body,
    );
  }

  @Post('return')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async verifyReturn(
    @Request() req: AuthedRequest,
    @UploadedFile() image: UploadedImage,
    @Body() body: VerifyDto,
  ) {
    if (!image)
      throw new BadRequestException('multipart "image" 필드가 필요합니다');
    return this.verifyService.verifyAndRecord(
      req.user.userId,
      UsageKind.RETURN,
      image,
      body,
    );
  }
}
