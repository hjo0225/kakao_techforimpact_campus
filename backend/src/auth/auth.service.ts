import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import axios from 'axios'

interface KakaoTokenResponse {
  access_token: string
}

interface KakaoUserResponse {
  id: number
  kakao_account: {
    profile: {
      nickname: string
      profile_image_url: string | null
    }
  }
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async kakaoLogin(code: string, redirectUri: string) {
    const kakaoToken = await this.getKakaoToken(code, redirectUri)
    const kakaoUser = await this.getKakaoUser(kakaoToken)

    const user = {
      id: kakaoUser.id,
      nickname: kakaoUser.kakao_account.profile.nickname,
      profileImage: kakaoUser.kakao_account.profile.profile_image_url ?? null,
    }

    const accessToken = this.jwtService.sign({ sub: user.id, nickname: user.nickname })

    return { user, accessToken }
  }

  private async getKakaoToken(code: string, redirectUri: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: redirectUri,
      code,
    })

    const { data } = await axios.post<KakaoTokenResponse>(
      'https://kauth.kakao.com/oauth/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    ).catch(() => {
      throw new UnauthorizedException('카카오 토큰 교환 실패')
    })

    return data.access_token
  }

  private async getKakaoUser(accessToken: string): Promise<KakaoUserResponse> {
    const { data } = await axios.get<KakaoUserResponse>(
      'https://kapi.kakao.com/v2/user/me',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ).catch(() => {
      throw new UnauthorizedException('카카오 유저 정보 조회 실패')
    })

    return data
  }
}
