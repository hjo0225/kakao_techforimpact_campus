import { IsOptional, IsString } from 'class-validator';

export class FindTenantStoresDto {
  @IsOptional()
  @IsString()
  stadiumCode?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  gate?: string;
}
