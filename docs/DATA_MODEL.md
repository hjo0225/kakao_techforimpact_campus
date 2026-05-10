# Data Model

> DB 스키마 / 마이그레이션 SSOT. 스키마 변경 시 여기를 먼저 갱신 후 마이그레이션 작성.

## 현재 상태

**DB 미도입.** 백엔드는 stateless로 카카오 인증만 처리, JWT를 stateless 검증 기반으로 사용.

**예정 DB**: GCP Cloud SQL (PostgreSQL).
**캐시**: GCP Memorystore (Redis) — 팀 랭킹 sorted set용.

---

## Entities (예정 — 구현 시 plan에서 확정)

### `users`

```sql
CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  kakao_id        BIGINT     NOT NULL UNIQUE,
  nickname        TEXT       NOT NULL,
  profile_image   TEXT,
  team_code       TEXT       REFERENCES teams(code),
  avatar_config   JSONB      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX users_team_code_idx ON users (team_code);
```

### `teams`

```sql
-- 마스터 데이터 (KBO 10개 팀)
CREATE TABLE teams (
  code         TEXT PRIMARY KEY,    -- 'doosan', 'lg', 'samsung', ...
  display_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  -- frontend src/app/teamBrand.ts와 1:1 매핑
);
```

### `usages` (다회용기 사용 기록)

```sql
CREATE TABLE usages (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES users(id),
  qr_payload   TEXT        NOT NULL,                    -- 원본 QR 데이터
  stadium_code TEXT,                                    -- 구장 식별 (TBD)
  scanned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat          NUMERIC(9,6),
  lng          NUMERIC(9,6),
  score        INTEGER     NOT NULL,                    -- 산정 알고리즘 적용 후 점수
  UNIQUE (user_id, qr_payload)                          -- 같은 QR 중복 스캔 방지
);
CREATE INDEX usages_user_scanned_idx ON usages (user_id, scanned_at DESC);
CREATE INDEX usages_scanned_idx ON usages (scanned_at DESC);
```

### `stadiums` (TBD)

QR payload에서 구장 식별 필요 시 추가.

---

## Redis Keys (예정)

| 키 | 타입 | 용도 |
|---|---|---|
| `ranking:teams:season:{year}` | ZSET | 팀별 누적 점수. `ZINCRBY` on usage write |
| `ranking:users:season:{year}` | ZSET | 유저별 누적 점수 |
| `user:{id}:streak` | STRING | 연속 사용 일수 (선택) |

---

## 마이그레이션 정책

- **도구**: TypeORM migration / Prisma migrate / Knex — 백엔드 ORM 결정 시 확정 (TBD)
- **이름 규칙**: `YYYYMMDDHHMMSS-<slug>.ts` (timestamp prefix)
- **롤백**: 각 마이그레이션은 `up` + `down` 짝
- **prod 적용**: Cloud SQL Proxy 통해 수동 실행 (CI 자동 적용은 안전성 검증 후)

---

## 백업 / DR (TBD)

- Cloud SQL automated backup 활성화 후 보존 기간 정책
- PITR (point-in-time recovery) 활성화 여부

---

## Open Questions

- [ ] ORM 선택 (TypeORM / Prisma / Drizzle)
- [ ] kakao_id를 PK로 쓸지, BIGSERIAL 별도 둘지 (현재 안: 별도 `id` PK + `kakao_id` UNIQUE)
- [ ] 시즌 정의 (1.1~12.31? 또는 KBO 시즌 일정?)
- [ ] QR payload 포맷 (운영사 협의)
- [ ] 점수 산정 알고리즘 (PRD F3 연결)
