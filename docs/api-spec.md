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

카카오 로그인 → DB upsert → JWT 발급. 두 가지 입력을 받는다:

1. **웹 (브라우저 OAuth redirect)**: `code`를 받아 백엔드에서 토큰 교환 + 프로필 조회
2. **WebView (네이티브 SDK)**: Expo 래퍼가 `@react-native-seoul/kakao-login`으로 발급받은
   카카오 `accessToken`을 postMessage 브릿지로 웹에 전달 → 토큰 교환 생략, 프로필 조회만

**Request body** — 둘 중 하나
```json
{
  "code": "string",          // 카카오 authorize 콜백의 query param `code`
  "redirectUri": "string"    // authorize 요청 시 사용한 redirect_uri와 정확히 일치
}
```
```json
{
  "accessToken": "string"    // 네이티브 카카오 SDK가 발급한 access token
}
```
> 둘 다 없으면 400 (ValidationPipe).

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

## Verify (휴먼인더루프 인증 + 학습데이터 적재)

다회용기 사용/반납 인증을 **2단계**로 처리한다. 어떤 판별 결과든 모든 시도를 학습용으로
`verification_samples` 테이블 + GCS(원본 이미지)에 영구 저장한다. AI(Vision Cloud Run,
`cleanballtrio-vision`, MobileNetV2)가 먼저 예측하고, **유저가 정답 라벨을 확정**한다.
유저 라벨이 `REUSABLE`일 때만 `usages`에 점수 행을 만든다.

공통 규칙:
- JWT 필수
- 점수: USE = 50점, RETURN = 100점 (`usages.score`)
- RETURN은 직전 12시간 내 USE가 있어야 점수 부여 (없으면 샘플은 기록하되 미점수)

### `POST /verify/analyze` (1단계)

이미지를 GCS에 적재하고 Vision 예측을 받아 `PENDING` 샘플을 만든다. Vision이 다운이어도
샘플은 적재되고 `ai`는 `null`이 된다.

**Request fields (multipart/form-data)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file | ✅ | JPEG/PNG/WebP. 최대 10MB. |
| `kind` | string | ✅ | `USE` 또는 `RETURN` |
| `gameId` | string | 선택 | 관람 중인 경기 id |
| `lat` | number | 선택 | 위도 |
| `lng` | number | 선택 | 경도 |

**Response 200**
```json
{
  "sampleId": "31",
  "ai": { "isReusable": true, "classIndex": 0, "confidence": 92.5 },
  "suggestedLabel": "REUSABLE"
}
```
- `ai`: Vision 다운 시 `null`
- `suggestedLabel`: UI 기본 선택값. AI가 일회용기로 보면 `SINGLE_USE`, 그 외(또는 null)는 `REUSABLE`

### `POST /verify/confirm` (2단계)

유저가 정답 라벨을 확정한다. `REUSABLE`이면 점수 행(usages)을 만들어 샘플에 연결한다.

**Request body (application/json)**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sampleId` | string | ✅ | 1단계에서 받은 샘플 id |
| `userLabel` | string | ✅ | `REUSABLE` 또는 `SINGLE_USE` |

**Response 200 — 점수 부여(REUSABLE)**
```json
{
  "sample": { "id": "31", "kind": "USE", "userLabel": "REUSABLE", "status": "CONFIRMED" },
  "scored": true,
  "usage": { "id": "12", "kind": "USE", "score": 50, "scannedAt": "2026-06-01T10:00:00.000Z" }
}
```

**Response 200 — 미점수(기록만)**
```json
{
  "sample": { "id": "31", "kind": "RETURN", "userLabel": "REUSABLE", "status": "CONFIRMED" },
  "scored": false,
  "reason": "NO_RECENT_USE"
}
```
- `reason`: `SINGLE_USE_LABEL`(일회용기 라벨 → 음성 샘플) / `NO_RECENT_USE`(RETURN 직전 USE 없음)
- 두 경우 모두 샘플은 `CONFIRMED`로 저장된다 (학습 데이터 유지)

### 공통 에러

| 상태 | code | 의미 |
|---|---|---|
| 400 | (NestJS) | `image`/`kind` 누락, 파일 크기 초과, `gameId`/`lat`/`lng`/`userLabel` validation |
| 401 | — | JWT 무효 |
| 403 | `NOT_OWNER` | 본인 샘플이 아님 |
| 404 | `SAMPLE_NOT_FOUND` | 없는 sampleId |
| 409 | `ALREADY_CONFIRMED` | 이미 라벨 확정된 샘플 |
| 503 | — | GCS 이미지 저장 실패 |

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
  "totalCount": 5
}
```

- `points`: `usages.score` 누적 합계 (USE=50, RETURN=100 기준)
- `useCount`: `kind = USE` 인증 횟수
- `returnCount`: `kind = RETURN` 인증 횟수
- `totalCount`: `min(useCount, returnCount)` — 사용·반납이 모두 인증된 컵 수(실제 회수된 다회용기). 단순 합산은 같은 컵을 2회로 부풀리므로 사용하지 않음

**Errors**
- `401 Unauthorized` — JWT 누락/무효/만료

> 구현은 Prisma `usage.groupBy({ by: ['kind'], _sum: { score }, _count })` 1쿼리. 신규 사용자(인증 0건)는 모두 0 반환.

### `GET /stats/me/logs`

본인 인증 로그 타임라인(최근순) 조회. JWT 필수.

**Query**
- `limit` (optional, int) — 반환 개수. 기본 `20`, 1~100으로 클램프.

**Response 200**
```json
[
  {
    "id": "2",
    "kind": "RETURN",
    "score": 100,
    "gameLabel": "LG 트윈스 vs 두산 베어스",
    "scannedAt": "2026-05-22T11:18:00.000Z"
  },
  {
    "id": "1",
    "kind": "USE",
    "score": 50,
    "gameLabel": null,
    "scannedAt": "2026-05-22T09:42:00.000Z"
  }
]
```

- `kind`: `USE` | `RETURN`
- `gameLabel`: 연결된 경기의 `"{홈팀} vs {원정팀}"`. `gameId` 없으면 `null`
- `scannedAt`: ISO 8601 UTC

**Errors**
- `401 Unauthorized` — JWT 누락/무효/만료

> 구현은 `usage.findMany({ where: { userId }, orderBy: { scannedAt: 'desc' }, take, include: { game } })`. 별도 테이블 없이 `usages`에서 직접 조회.

---

## Attendance (경기 선택 / 직관)

경기를 선택해두면 **경기 날짜가 지나도록 취소하지 않을 경우 직관 방문으로 확정**됩니다. 확정은 별도 상태 없이 읽는 시점에 `game.date < 오늘(KST)` 로 계산합니다.

### `GET /attendance/me`

본인의 현재 선택 + 직관 확정 방문 조회. JWT 필수.

**Response 200**
```json
{
  "current": {
    "gameId": "12",
    "date": "2026-05-23",
    "startTime": "18:30",
    "venue": "잠실",
    "homeTeam": { "code": "LG", "displayName": "LG 트윈스" },
    "awayTeam": { "code": "OB", "displayName": "두산 베어스" }
  },
  "visits": [
    {
      "gameId": "8",
      "date": "2026-05-20",
      "startTime": "18:30",
      "venue": "잠실",
      "homeTeam": { "code": "LG", "displayName": "LG 트윈스" },
      "awayTeam": { "code": "SSG", "displayName": "SSG 랜더스" }
    }
  ]
}
```

- `current`: 활성 선택 중 `date >= 오늘(KST)` 인 경기. 없으면 `null`
- `visits`: 활성 선택 중 `date < 오늘(KST)` 인 경기 (직관 확정), 최신순

### `POST /attendance`

경기 선택. JWT 필수. 아직 안 지난 다른 활성 선택은 자동 취소(현재 선택 1개 유지).

**Request body**
```json
{ "gameId": "12" }
```

**Response 200** — 선택된 경기 요약 (`current`와 동일 shape)

**Errors**
- `404 Not Found` — 존재하지 않는 `gameId`
- `401 Unauthorized`

### `DELETE /attendance/:gameId`

현재 선택 취소(직관 미인정). 이미 취소/없는 경우에도 멱등.

**Response 204** — 본문 없음

**Errors**
- `401 Unauthorized`

> 구현은 `attendances` 테이블 upsert/updateMany. `(user_id, game_id)` UNIQUE. 확정 판정은 on-read.

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

- `GET /usages/me` — 본인 인증 히스토리 (날짜/타임라인용) — 현재 `GET /stats/me/logs`로 부분 제공 중
- `GET /rankings/users` — 개인 전체 랭킹 (페이지네이션 필수)
- `POST /auth/refresh` — 토큰 갱신
- `POST /auth/logout` — 서버 측 invalidate (현재 클라이언트만 토큰 폐기)

> QR 기반 인증(`POST /qr/scan`)은 Vision API 피벗으로 폐기됨 — `POST /verify/use`·`POST /verify/return` 참고.

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
