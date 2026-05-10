# API Spec

> Single Source of Truth for API endpoints. 시그니처 변경 시 코드보다 **여기를 먼저** 갱신 + `CHANGELOG.md` 동시 업데이트.

**Base URL**:
- dev: `http://localhost:3001`
- prod: `https://cleanballtrio-api-fpvvjohnta-du.a.run.app`

**Content-Type**: 모든 POST/PUT body는 `application/json`.

---

## Health

### `GET /`

루트 헬스체크. NestJS 기본 `AppController`.

**Response 200**
```
Hello World!
```
> 추후 `/health` 별도 엔드포인트로 분리 + DB/Redis ping 포함하는 게 좋음 (TBD).

---

## Auth

### `POST /auth/kakao`

카카오 OAuth `code`를 받아 백엔드에서 토큰 교환 + 유저 조회 후 JWT 발급.

**Request body**
```json
{
  "code": "string",          // 카카오 authorize 콜백의 query param `code`
  "redirectUri": "string"    // authorize 요청 시 사용한 redirect_uri와 정확히 일치
}
```

**Response 200**
```json
{
  "user": {
    "id": 123456789,                                  // kakao_id (number)
    "nickname": "홍길동",
    "profileImage": "https://k.kakaocdn.net/..."     | null
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI..."     // JWT (HS256)
}
```

**JWT payload**
```json
{
  "sub": 123456789,           // kakao_id
  "nickname": "홍길동",
  "iat": 1700000000,
  "exp": 1700604800           // (기본 NestJS JWT 만료 — TBD: 명시 설정)
}
```

**Errors**

| 상태 | 메시지 | 원인 |
|---|---|---|
| 401 | `카카오 토큰 교환 실패: {...}` | 잘못된 code, 만료된 code, redirect_uri 불일치 (`KOE320` 등) |
| 401 | `카카오 유저 정보 조회 실패: {...}` | access_token 거부 — 일반적으로 발생 안 함 |
| 400 | (NestJS 기본) | body 스키마 검증 실패 |

> **주의**: 현재 에러 메시지에 카카오 응답 본문을 그대로 포함 (`JSON.stringify(detail)`). 운영 단계에서 마스킹/축약 필요.

---

## (예정) 추후 작성 영역

DB 도입 후 작성 — 구현 시 plan에서 이 섹션 갱신:

- `GET /me` — JWT 검증 + 유저 프로필
- `POST /qr/scan` — 다회용기 사용 인증 (QR payload + lat/lng)
- `GET /rankings/teams` — 팀별 실시간 랭킹 (Redis)
- `GET /stats/me` — 사용자 누적 사용량/등급
- `POST /auth/refresh` — 토큰 갱신
- `POST /auth/logout` — 서버 측 invalidate (현재 클라이언트만 토큰 폐기)

---

## CORS

`CORS_ORIGIN` env로 제어 (콤마 구분 다중 origin).

현재 prod 허용 origin:
- `http://localhost:5173`
- `https://cleanballtrio.web.app`
- `https://cleanballtrio.firebaseapp.com`

추가/변경:
```powershell
gcloud run services update cleanballtrio-api --region asia-northeast3 `
  --update-env-vars="^@^CORS_ORIGIN=val1,val2,val3"
```

> 콤마가 포함된 값은 `^@^` 커스텀 구분자 필수.
