import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService.kakaoLogin', () => {
  let service: AuthService;
  const jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const prisma = {
    user: {
      upsert: jest.fn().mockResolvedValue({
        id: BigInt(1),
        nickname: '홍길동',
        profileImage: null,
        teamCode: null,
        role: 'USER',
      }),
    },
  };
  const kakaoUser = {
    id: 12345,
    kakao_account: {
      profile: { nickname: '홍길동', profile_image_url: null },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.isAxiosError as unknown as jest.Mock) = jest
      .fn()
      .mockReturnValue(false);
    service = new AuthService(
      jwtService as unknown as JwtService,
      prisma as unknown as PrismaService,
    );
  });

  it('accessToken이 오면 토큰 교환 없이 프로필 조회만 한다 (WebView 네이티브 로그인)', async () => {
    mockedAxios.get.mockResolvedValue({ data: kakaoUser });

    const result = await service.kakaoLogin({ accessToken: 'native-token' });

    expect(mockedAxios.post).not.toHaveBeenCalled(); // 토큰 교환 생략
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://kapi.kakao.com/v2/user/me',
      { headers: { Authorization: 'Bearer native-token' } },
    );
    expect(result.accessToken).toBe('signed-jwt');
    expect(result.user.id).toBe('1');
  });

  it('code+redirectUri가 오면 토큰 교환 후 프로필을 조회한다 (웹 OAuth)', async () => {
    mockedAxios.post.mockResolvedValue({ data: { access_token: 'exchanged' } });
    mockedAxios.get.mockResolvedValue({ data: kakaoUser });

    await service.kakaoLogin({ code: 'auth-code', redirectUri: 'http://r' });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://kapi.kakao.com/v2/user/me',
      { headers: { Authorization: 'Bearer exchanged' } },
    );
  });

  it('code/accessToken 둘 다 없으면 400', async () => {
    await expect(service.kakaoLogin({})).rejects.toThrow(BadRequestException);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
