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

다회용기 사용/반납 인증. 내부적으로 Vision Cloud Run(`cleanballtrio-vision`, MobileNetV2)에 forward한 뒤 통과 시 `usages` 테이블에 기록 + 점수 부여.

공통 규칙:
- JWT 필수
- `Content-Type: multipart/form-data`
- 검증 기준: `isReusable === true` **그리고** `confidence ≥ 70` → 통과
- 통과 시: USE = 50점, RETURN = 100점 (`usages.score`)

### `POST /verify/use`

**Request fields (multipart)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file | ✅ | JPEG/PNG. 최대 10MB. |
| `gameId` | string | 선택 | 관람 중인 경기 id (게임 사용 통계용) |
| `lat` | number | 선택 | 위도 |
| `lng` | number | 선택 | 경도 |

**Response 200**
```json
{
  "vision": { "isReusable": true, "classIndex": 0, "confidence": 92.5 },
  "usage": {
    "id": "12",
    "kind": "USE",
    "score": 50,
    "scannedAt": "2026-05-12T10:00:00.000Z"
  }
}
```

### `POST /verify/return`

USE와 동일한 요청 스키마. **추가 가드**:
- 같은 사용자의 가장 최근 USE가 12시간 이내에 있어야 함
- 없으면 `409 Conflict { code: 'NO_RECENT_USE' }`

응답 형태는 USE와 동일하지만 `usage.kind = "RETURN"`, `usage.score = 100`.

### 공통 에러

| 상태 | code | 의미 |
|---|---|---|
| 400 | `NOT_REUSABLE` | 모델이 single_use로 판별 |
| 400 | `LOW_CONFIDENCE` | confidence < 70% |
| 400 | (NestJS) | `image` 누락 / 파일 크기 초과 / `gameId`/`lat`/`lng` validation |
| 401 | — | JWT 무효 |
| 409 | `NO_RECENT_USE` | RETURN인데 직전 12시간 USE 없음 |
| 503 | — | Vision 서비스 타임아웃/다운 |

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

## Stats

### `GET /stats/me`

본인 누적 통계 조회. JWT 필수.

**Response 200**
```json
{
  "points": 850,
  "useCount": 7,
  "returnCount": 5,
  "totalCount": 12
}
```

- `points`: `usages.score` 누적 합계 (USE=50, RETURN=100 기준)
- `useCount`: `kind = USE` 인증 횟수
- `returnCount`: `kind = RETURN` 인증 횟수
- `totalCount`: useCount + returnCount

**Errors**
- `401 Unauthorized` — JWT 누락/무효/만료

> 구현은 Prisma `usage.groupBy({ by: ['kind'], _sum: { score }, _count })` 1쿼리. 신규 사용자(인증 0건)는 모두 0 반환.

---

## Rankings

### `GET /rankings/teams`

KBO 팀별 누적 친환경 포인트 조회. **인증 불필요**.

**Response 200**
```json
[
  {
    "teamCode": "LG",
    "displayName": "LG 트윈스",
    "totalPoints": 1800,
    "memberCount": 12
  },
  {
    "teamCode": "KIA",
    "displayName": "KIA 타이거즈",
    "totalPoints": 1500,
    "memberCount": 9
  }
]
```

- 정렬: `totalPoints DESC, teamCode ASC` (동률이면 코드 알파벳)
- `teams` 마스터(10개)에서 LEFT JOIN → **점수 0인 팀도 포함**되어 항상 10행 반환
- `totalPoints`: 해당 팀 응원 사용자(`users.team_code = teams.code`)의 `usages.score` 합계
- `memberCount`: 해당 팀 응원 사용자 수 (인증 여부 무관)

**Errors**
- 없음 (조회 실패 시 500)

> MVP에서는 매 요청마다 PostgreSQL aggregate 1쿼리. 사용자/usage 행 수 증가 시 Redis ZSET(`ranking:teams`) 도입 검토.

---

## (예정) 추후 작성 영역

구현 시 plan에서 이 섹션 갱신:

- `POST /qr/scan` — 다회용기 사용 인증 (QR payload + lat/lng)
- `GET /usages/me` — 본인 인증 히스토리 (날짜/타임라인용)
- `GET /rankings/users` — 개인 전체 랭킹 (페이지네이션 필수)
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
