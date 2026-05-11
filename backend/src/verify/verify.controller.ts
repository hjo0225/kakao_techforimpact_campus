import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { VerifyService } from './verify.service'

interface UploadedImage {
  buffer: Buffer
  originalname: string
  mimetype: string
}

@Controller('verify')
@UseGuards(JwtAuthGuard)
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Post('reusable')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async verifyReusable(@UploadedFile() image: UploadedImage) {
    if (!image) {
      throw new BadRequestException('multipart "image" 필드가 필요합니다')
    }
    return this.verifyService.verifyReusable(image)
  }
}
