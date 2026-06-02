import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVisitCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  teamCode?: string;
}
