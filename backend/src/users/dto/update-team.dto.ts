import { IsIn, IsString } from 'class-validator'

// teams.code 마스터 (prisma/seed.ts와 동기화)
export const KBO_TEAM_CODES = [
  'LG',
  'DS',
  'SS',
  'HH',
  'KT',
  'NC',
  'OB',
  'HB',
  'KIA',
  'SK',
] as const

export type KboTeamCode = (typeof KBO_TEAM_CODES)[number]

export class UpdateTeamDto {
  @IsString()
  @IsIn(KBO_TEAM_CODES as unknown as string[])
  teamCode!: KboTeamCode
}
