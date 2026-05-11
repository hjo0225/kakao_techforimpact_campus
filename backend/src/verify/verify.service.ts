import {
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'
import FormData from 'form-data'

export interface ReusableVerifyResult {
  isReusable: boolean
  classIndex: number
  confidence: number
}

interface UploadedImage {
  buffer: Buffer
  originalname: string
  mimetype: string
}

@Injectable()
export class VerifyService {
  private readonly logger = new Logger(VerifyService.name)

  constructor(private readonly config: ConfigService) {}

  async verifyReusable(image: UploadedImage): Promise<ReusableVerifyResult> {
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
