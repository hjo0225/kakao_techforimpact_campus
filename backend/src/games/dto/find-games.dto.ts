import { IsDateString, IsOptional } from 'class-validator'

export class FindGamesDto {
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string // YYYY-MM-DD inclusive

  @IsOptional()
  @IsDateString({ strict: true })
  to?: string // YYYY-MM-DD inclusive
}
