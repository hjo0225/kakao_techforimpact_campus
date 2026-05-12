import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNumberString,
  IsOptional,
} from 'class-validator';

// multipart/form-data 호환을 위해 모든 값은 string으로 들어옴 → Type 데코레이터로 변환
export class VerifyDto {
  @IsOptional()
  @IsNumberString()
  gameId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}
