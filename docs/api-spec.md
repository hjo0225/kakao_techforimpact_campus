# API Spec

> Single Source of Truth for API endpoints. 시그니처 변경 시 코드보다 **여기를 먼저** 갱신 + `CHANGELOG.md` 동시 업데이트.

**Base URL**:
- dev: `http://localhost:3001`
- prod: `https://cleanballtrio-api-fpvvjohnta-du.a.run.app`

**Content-Type**: 모든 POST/PUT/PATCH body는 `application/json`.

**Auth**: 보호된 엔드포인트는 `Authorization: Bearer <accessToken>` 헤더 필수. 토큰은 `/auth/kakao`로 발급.

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

카카오 OAuth `code`를 받아 백엔드에서 토큰 교환 + 카카오 프로필 조회 → DB upsert → JWT 발급.

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
    "id": "1",                                        // 백엔드 DB id (BigInt → string)
    "nickname": "홍길동",
    "profileImage": "https://k.kakaocdn.net/..." | null,
    "teamCode": "LG" | null                          // 사용자가 선택한 응원팀 (없으면 null)
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI..."     // JWT (HS256)
}
```

**JWT payload**
```json
{
  "sub": "1",                 // 백엔드 DB user id (string). ⚠️ 이전 버전에서는 kakao_id였음
  "nickname": "홍길동",
  "iat": 1700000000,
  "exp": 1700604800            // 발급 시점 + 7일 (auth.module의 expiresIn)
}
```

> **Breaking change (2026-05)**: `sub`가 `kakao_id` → `user.id`(DB)로 의미가 바뀌었습니다. 이전 토큰은 모두 무효. 프론트엔드 zustand persist version 2로 강제 재로그인됩니다.

**Errors**

| 상태 | 메시지 | 원인 |
|---|---|---|
| 401 | `카카오 토큰 교환 실패: {...}` | 잘못된 code, 만료된 code, redirect_uri 불일치 (`KOE320` 등) |
| 401 | `카카오 유저 정보 조회 실패: {...}` | access_token 거부 — 일반적으로 발생 안 함 |
| 400 | (NestJS 기본) | body 스키마 검증 실패 |

> **주의**: 현재 에러 메시지에 카카오 응답 본문을 그대로 포함 (`JSON.stringify(detail)`). 운영 단계에서 마스킹/축약 필요.

---

## Me

모두 `Authorization: Bearer <JWT>` 필수. 검증 실패 시 401.

### `GET /me`

JWT 검증 후 본인 프로필 조회.

**Response 200**
```json
{
  "id": "1",
  "nickname": "홍길동",
  "profileImage": "https://..." | null,
  "teamCode": "LG" | null,
  "avatarConfig": { /* 자유 형식 */ } | null,
  "createdAt": "2026-05-11T12:00:00.000Z"
}
```

**Errors**
- `401 Unauthorized` — JWT 누락/무효/만료
- `404 사용자를 찾을 수 없습니다` — DB에서 user.id 매칭 실패 (가입 후 삭제된 계정 등)

### `PATCH /me/team`

응원팀 변경.

**Request body**
```json
{ "teamCode": "LG" }   // teams.code FK 값 (LG, DS, SS, HH, KT, NC, OB, HB, KIA, SK)
```

**Response 200**
```json
{ "id": "1", "teamCode": "LG" }
```

**Errors**
- `401` — JWT 무효
- `500` — 존재하지 않는 teamCode (FK 위반) ⚠️ TODO: 입력 검증 추가 후 400으로 변경

### `PATCH /me/avatar`

아바타 설정 저장 (JSON 자유 형식).

**Request body**
```json
{ "avatarConfig": { /* 자유 형식 */ } }
```

**Response 200**
```json
{ "id": "1", "avatarConfig": { /* 저장된 값 */ } }
```

---

## Verify (Vision AI)

### `POST /verify/reusable`

업로드된 이미지가 **다회용기인지 일회용기인지** 분류. 내부적으로 별도의 Python Cloud Run 서비스(`cleanballtrio-vision`, MobileNetV2)에 forward한다. JWT 필수.

**Request** — `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file | ✅ | JPEG/PNG. 최대 10MB. |

**Response 200**
```json
{
  "isReusable": true,
  "classIndex": 0,
  "confidence": 96.42
}
```
- `classIndex`: `0`=`reusable`, `1`=`single_use` (모델 학습 시 폴더명 알파벳순)
- `confidence`: 0~100 (해당 클래스의 softmax 확률 × 100)

**Errors**
- `400` — `image` 필드 누락 / 파일 크기 초과 / 이미지 디코딩 실패
- `401` — JWT 무효
- `503` — vision 서비스 타임아웃 또는 다운

> 사용 인증과 반납 인증 모두 동일한 분류기를 사용. 비즈니스 단(시간/위치 가드, `usages` 적재 등)은 후속 plan.

---

## Games

### `GET /games`

KBO 경기 일정 조회. 인증 불필요.

**Query parameters**

| 이름 | 형식 | 필수 | 설명 |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | 선택 | 시작일 (inclusive) |
| `to`   | `YYYY-MM-DD` | 선택 | 종료일 (inclusive) |

`from`/`to` 모두 없으면 전체 일정 반환. `date asc, startTime asc` 정렬.

**Response 200**
```json
[
  {
    "id": "1",
    "date": "2026-05-20",
    "startTime": "18:30",
    "awayTeam": { "code": "NC", "displayName": "NC 다이노스" },
    "homeTeam": { "code": "DS", "displayName": "두산 베어스" },
    "venue": "잠실",
    "status": "-"
  }
]
```

**Errors**
- `400` — `from`/`to` 형식 부적합

---

## (예정) 추후 작성 영역

DB 도입 후 작성 — 구현 시 plan에서 이 섹션 갱신:

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
