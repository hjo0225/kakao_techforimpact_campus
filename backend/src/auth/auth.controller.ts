import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { KakaoCallbackDto } from './dto/kakao-callback.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao')
  kakaoLogin(@Body() dto: KakaoCallbackDto) {
    return this.authService.kakaoLogin(dto.code, dto.redirectUri)
  }
}
