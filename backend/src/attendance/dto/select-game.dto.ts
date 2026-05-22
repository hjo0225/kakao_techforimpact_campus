import { IsNotEmpty, IsNumberString } from 'class-validator';

export class SelectGameDto {
  @IsNotEmpty()
  @IsNumberString()
  gameId!: string; // games.id (BigInt) — 문자열로 수신
}
