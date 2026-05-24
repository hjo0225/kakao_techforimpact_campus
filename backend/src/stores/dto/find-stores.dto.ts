import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toBoolean } from '../stores.utils';

export class FindStoresDto {
  @IsOptional()
  @IsString()
  stadiumCode?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value, true))
  @IsBoolean()
  foodOnly?: boolean = true;

  @IsOptional()
  @IsString()
  gameId?: string;
}
