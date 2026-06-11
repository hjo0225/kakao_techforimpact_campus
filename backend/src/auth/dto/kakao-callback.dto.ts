import { IsString, ValidateIf } from 'class-validator';

/**
 * 두 가지 입력 중 하나:
 * - 웹 OAuth redirect: { code, redirectUri }
 * - WebView 네이티브 SDK: { accessToken }
 */
export class KakaoCallbackDto {
  @ValidateIf((o: KakaoCallbackDto) => !o.accessToken)
  @IsString()
  code?: string;

  @ValidateIf((o: KakaoCallbackDto) => !o.accessToken)
  @IsString()
  redirectUri?: string;

  @ValidateIf((o: KakaoCallbackDto) => !o.code)
  @IsString()
  accessToken?: string;
}
