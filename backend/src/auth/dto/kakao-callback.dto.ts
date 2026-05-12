import { IsString } from 'class-validator';

export class KakaoCallbackDto {
  @IsString()
  code!: string;

  @IsString()
  redirectUri!: string;
}
