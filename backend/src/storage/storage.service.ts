import {
  Injectable,
  Logger,
  NotFoundException,
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
    return this.uploadTo('verify', userId, image);
  }

  /** 직관카드 이미지를 업로드. */
  async uploadVisitCardImage(
    userId: string,
    image: UploadInput,
  ): Promise<UploadResult> {
    return this.uploadTo('visit-cards', userId, image);
  }

  private async uploadTo(
    keyPrefix: string,
    userId: string,
    image: UploadInput,
  ): Promise<UploadResult> {
    const hash = createHash('sha256').update(image.buffer).digest('hex');
    const ext = EXT_BY_MIME[image.mimetype] ?? 'bin';
    const objectName = `${keyPrefix}/${userId}/${hash}.${ext}`;

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

  /**
   * gs:// 경로의 이미지를 내려받는다 (캘린더 사진/직관카드 서빙용).
   */
  async downloadImage(
    imagePath: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(imagePath);
    if (!match) {
      throw new NotFoundException('잘못된 이미지 경로입니다');
    }
    const [, bucket, objectName] = match;
    const ext = objectName.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    try {
      const [buffer] = await this.storage
        .bucket(bucket)
        .file(objectName)
        .download();
      return { buffer, contentType };
    } catch (err) {
      this.logger.error('GCS 다운로드 실패', err);
      throw new NotFoundException('이미지를 찾을 수 없습니다');
    }
  }
}
