import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumberString,
  IsOptional,
} from 'class-validator';

export enum VerifyKind {
  USE = 'USE',
}

export enum UserLabel {
  REUSABLE = 'REUSABLE',
  SINGLE_USE = 'SINGLE_USE',
}

// multipart/form-data 호환을 위해 모든 값은 string으로 들어옴 → Type 데코레이터로 변환
export class AnalyzeDto {
  @IsEnum(VerifyKind)
  kind!: VerifyKind;

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

export class ConfirmDto {
  @IsNumberString()
  sampleId!: string;

  @IsEnum(UserLabel)
  userLabel!: UserLabel;
}
