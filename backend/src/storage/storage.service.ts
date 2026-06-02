import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { createHash } from 'crypto';

export interface UploadInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface UploadResult {
  /** gs://<bucket>/<object> */
  path: string;
  /** sha256(buffer) — 중복 제거/추적용 */
  hash: string;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storage = new Storage();
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.getOrThrow<string>('GCS_TRAINING_BUCKET');
  }

  /**
   * 인증 이미지를 학습용 버킷에 업로드. 같은 이미지(=같은 hash)는 같은 경로에 멱등 저장.
   */
  async uploadVerificationImage(
    userId: string,
    image: UploadInput,
  ): Promise<UploadResult> {
    const hash = createHash('sha256').update(image.buffer).digest('hex');
    const ext = EXT_BY_MIME[image.mimetype] ?? 'bin';
    const objectName = `verify/${userId}/${hash}.${ext}`;

    try {
      await this.storage
        .bucket(this.bucketName)
        .file(objectName)
        .save(image.buffer, {
          contentType: image.mimetype,
          resumable: false,
        });
    } catch (err) {
      this.logger.error('GCS 업로드 실패', err);
      throw new ServiceUnavailableException('이미지 저장에 실패했습니다');
    }

    return { path: `gs://${this.bucketName}/${objectName}`, hash };
  }
}
