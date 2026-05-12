# Data Model

> DB 스키마 / 마이그레이션 SSOT. 스키마 변경 시 여기를 먼저 갱신 후 마이그레이션 작성.

## 현재 상태

- **DB**: GCP Cloud SQL (PostgreSQL 16, db-f1-micro, asia-northeast3, 인스턴스 `cleanballtrio-db`, DB명 `cleanballtrio`)
- **ORM**: Prisma 5.x (`backend/prisma/schema.prisma`)
- **마이그레이션 도구**: `prisma migrate` (개발: `migrate dev`, prod: `migrate deploy` — Cloud Run 컨테이너 시작 시 자동 실행)
- **로컬 개발**: Cloud SQL Auth Proxy(추천) 또는 로컬 Docker PostgreSQL. `backend/.env`의 `DATABASE_URL`로 제어.
- **캐시**: GCP Memorystore (Redis) — **미도입**, 팀 랭킹 sorted set용으로 예정.

`schema.prisma`가 코드 SSOT이며, 본 문서는 의도/근거/마이그레이션 정책을 기록합니다.

---

## Entities (현재 적용 — `prisma/migrations/20260511130625_init`)

### `users`

```sql
CREATE TABLE users (
  id              BIGSERIAL    PRIMARY KEY,
  kakao_id        BIGINT       NOT NULL UNIQUE,
  nickname        TEXT         NOT NULL,
  profile_image   TEXT,
  team_code       TEXT,                                  -- (현재 FK 없음 — 아래 Open Questions 참고)
  avatar_config   JSONB,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(3) NOT NULL
);
CREATE INDEX users_team_code_idx ON users (team_code);
```

> **참고**: 초기 마이그레이션은 `team_code → teams.code` FK를 생성하지 않습니다. 다음 마이그레이션에서 FK 추가 예정 (teams 시드 후).

### `teams`

```sql
-- 마스터 데이터 (KBO 10개 팀)
CREATE TABLE teams (
  code          TEXT PRIMARY KEY,    -- 'LG', 'DS', 'SS', 'HH', 'KT', 'NC', 'OB', 'HB', 'KIA', 'SK'
  display_name  TEXT NOT NULL,
  primary_color TEXT NOT NULL
);
```

시드는 `prisma/seed.ts` (`npm run db:seed`로 실행). 프론트엔드 `src/app/teamBrand.ts`와 1:1 매핑되어야 함.

### `games` (KBO 경기 일정)

```sql
CREATE TABLE games (
  id              BIGSERIAL    PRIMARY KEY,
  date            DATE         NOT NULL,
  start_time      TEXT         NOT NULL,                  -- "HH:MM" KST
  away_team_code  TEXT         NOT NULL REFERENCES teams(code),
  home_team_code  TEXT         NOT NULL REFERENCES teams(code),
  venue           TEXT         NOT NULL,                  -- 잠실, 광주, 고척, ...
  status          TEXT         NOT NULL DEFAULT '-',      -- 정적 일정은 '-'. 추후 라이브 스코어/취소 등
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(3) NOT NULL,
  UNIQUE (date, away_team_code, home_team_code)
);
CREATE INDEX games_date_idx ON games (date);
```

> 시즌 시작 시 `prisma/seed.ts`의 `seedGames()`가 사용자 제공 일정 텍스트를 파싱해 적재. 라이브 스코어 / 우천 취소 / 더블헤더는 향후 plan에서 보완.

### `usages` (다회용기 사용/반납 기록)

```sql
CREATE TYPE "UsageKind" AS ENUM ('USE', 'RETURN');

CREATE TABLE usages (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      BIGINT       NOT NULL REFERENCES users(id),
  kind         "UsageKind"  NOT NULL,
  qr_payload   TEXT,                                     -- Vision 인증에는 없음 (nullable)
  game_id      BIGINT       REFERENCES games(id),        -- 어떤 경기에서 (optional)
  stadium_code TEXT,
  scanned_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  score        INTEGER      NOT NULL DEFAULT 0,
  confidence   DOUBLE PRECISION                          -- Vision API confidence (0~100)
);
CREATE INDEX usages_user_scanned_idx ON usages (user_id, scanned_at);
CREATE INDEX usages_scanned_idx ON usages (scanned_at);
CREATE INDEX usages_user_kind_idx ON usages (user_id, kind);
```

- `kind`: `USE`(사용 인증) / `RETURN`(반납 인증)
- `score`: 검증 통과 시 USE=50, RETURN=100 (`backend/src/verify/verify.service.ts` 상수)
- `qr_payload`는 향후 QR 스캔 방식 도입 시 사용. 현재는 Vision 인증만 있어 항상 null
- 멱등성 키는 현재 없음 — 같은 사용자가 같은 이미지를 두 번 인증해도 두 행. UI에서 다운로드/재시도 가드 필요 시 후속 plan

> `lat/lng`는 PRD 상 NUMERIC(9,6)이었으나 Prisma의 `Float` → `DOUBLE PRECISION`으로 매핑됨. PostGIS 도입 시 재검토.

### `stadiums` (TBD)

QR payload에서 구장 식별 필요 시 추가.

---

## Redis Keys (예정 — 미도입)

현재 팀 랭킹(`GET /rankings/teams`)은 PostgreSQL aggregate(`teams LEFT JOIN users LEFT JOIN usages GROUP BY team_code`)로 매 요청 처리. 사용자/usage 행 수가 충분히 커져 응답 지연이 발생하는 시점에 아래 ZSET 도입.

| 키 | 타입 | 용도 |
|---|---|---|
| `ranking:teams:season:{year}` | ZSET | 팀별 누적 점수. `ZINCRBY` on usage write |
| `ranking:users:season:{year}` | ZSET | 유저별 누적 점수 |
| `user:{id}:streak` | STRING | 연속 사용 일수 (선택) |

---

## 마이그레이션 정책

- **도구**: Prisma Migrate
- **이름 규칙**: Prisma 자동 생성 (`<timestamp>_<slug>`)
- **롤백**: Prisma는 down 마이그레이션을 자동 생성하지 않음 — 필요한 경우 수동 SQL 롤백 작성
- **prod 적용**: Cloud Run 컨테이너 시작 시 `prisma migrate deploy` 자동 실행 (Dockerfile `CMD`). Prisma의 advisory lock으로 다중 인스턴스 동시 시작 시에도 안전.
- **시드**: `prod 자동 실행 안 함`. Cloud SQL Auth Proxy 통해 `npm run db:seed` 수동 실행 (초기 1회).

---

## 백업 / DR (TBD)

- Cloud SQL automated backup 활성화 후 보존 기간 정책
- PITR (point-in-time recovery) 활성화 여부

---

## Open Questions

- [ ] `users.team_code → teams.code` FK 제약 추가 (현재 미설정 — 시드 후 마이그레이션)
- [ ] 시즌 정의 (1.1~12.31? 또는 KBO 시즌 일정?)
- [ ] QR payload 포맷 (운영사 협의)
- [ ] 점수 산정 알고리즘 (PRD F3 연결)
