# 유저 카운트 지표: 누적 가입자 + DAU/MAU (관리용)

## Context

사용자 결정 (2026-05-18 세션):
- 측정 대상: **누적 가입자** + **DAU / MAU**
- 노출 위치: **관리용 집계만**. 앱·웹 UI에 사용자에게 보여주지 않음.
- 즉 공개 엔드포인트(`/stats/global`) 같은 거 안 만들고, DB 쿼리·관리 대시보드로 충분.

기존 자원:
- `users.created_at` 컬럼은 이미 있음 (`prisma/schema.prisma:18`) — 누적·신규 가입자 SQL은 추가 작업 없이 즉시 가능.
- 활성 사용자(DAU/MAU)는 "마지막 접속 시각"을 어딘가 기록해야 함. 현재 없음.

## 변경

### 1. `backend/prisma/schema.prisma` — `User.lastSeenAt` 추가

```diff
 model User {
   id           BigInt   @id @default(autoincrement())
   ...
   createdAt    DateTime @default(now()) @map("created_at")
   updatedAt    DateTime @updatedAt @map("updated_at")
+  lastSeenAt   DateTime? @map("last_seen_at")
   ...
+  @@index([lastSeenAt], name: "users_last_seen_at_idx")
   @@map("users")
 }
```

- `nullable` — 기존 사용자 backfill 부담 없음, 첫 활동 시 채워짐.
- 인덱스 — DAU/MAU 쿼리에서 시간 범위 스캔이 잦음.

마이그레이션: `npm run db:migrate:dev -- --name add_user_last_seen_at`

### 2. `last_seen_at` 갱신 전략

#### 옵션 A — `JwtStrategy.validate`에서 매 요청 갱신 (간단, 권장)

`backend/src/auth/jwt.strategy.ts`의 `validate(payload)`에서:

```ts
async validate(payload: { sub: string }) {
  const userId = BigInt(payload.sub);
  // throttle: 마지막 갱신이 5분 이내면 skip (writes 절감)
  await this.prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });
  return { id: payload.sub };
}
```

쓰기 부하 우려 — **throttle 권장**:
- 가장 단순: `updatedAt`을 안 건드리는 별도 raw SQL `UPDATE users SET last_seen_at = NOW() WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes')`
- 또는 Redis 캐시로 "최근 갱신한 userId"를 5분 TTL로 묶어두기

#### 옵션 B — 별도 events 테이블 (정밀, overkill)

`user_activity_events(user_id, occurred_at)` 등. 시계열 분석엔 강력하지만 본 목적(DAU/MAU)엔 과함. 본 plan 범위 외.

**채택**: A + throttle.

### 3. 운영 SQL 모음 — `docs/runbooks/user-metrics.md` 신설

(plan 완료 시 같이 추가하는 운영 문서. 본 plan 범위에 포함.)

```sql
-- 누적 가입자
SELECT COUNT(*) FROM users;

-- 신규 가입 (일별, 최근 30일)
SELECT DATE(created_at) AS day, COUNT(*) AS new_users
FROM users
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day ORDER BY day DESC;

-- DAU (오늘)
SELECT COUNT(*) FROM users
WHERE last_seen_at >= CURRENT_DATE;

-- DAU (최근 30일, 일별)
SELECT DATE(last_seen_at) AS day, COUNT(*) AS dau
FROM users
WHERE last_seen_at >= NOW() - INTERVAL '30 days'
GROUP BY day ORDER BY day DESC;

-- MAU (최근 30일)
SELECT COUNT(*) FROM users
WHERE last_seen_at >= NOW() - INTERVAL '30 days';

-- WAU (최근 7일)
SELECT COUNT(*) FROM users
WHERE last_seen_at >= NOW() - INTERVAL '7 days';

-- 팀별 활성 사용자 (최근 30일)
SELECT team_code, COUNT(*) AS active_users
FROM users
WHERE last_seen_at >= NOW() - INTERVAL '30 days'
GROUP BY team_code ORDER BY active_users DESC;
```

### 4. `docs/DATA_MODEL.md` 갱신

`User` 섹션에 `last_seen_at: DateTime?` 추가, 운영 지표 용도 한 줄 명시.

## 변경 없음

- 공개 API — 노출 안 함이 결정. `/stats/global` 같은 엔드포인트 안 만듦.
- 프론트엔드.
- 기존 `User.createdAt`, `updatedAt`.

## 검증

- `cd backend && npm run db:migrate:dev` — 마이그레이션 통과
- 인증된 API 1회 호출 → `users.last_seen_at` 갱신 확인
- 5분 내 재호출 → DB write 발생 안 함 (throttle 동작)
- 운영 SQL 6개 실행 → 결과 정상

## 위험 & 완화

| 위험 | 완화 |
|---|---|
| 매 요청마다 user update → DB write 폭증 | throttle (5분 윈도우). updatedAt이 같이 갱신되면 의도와 다른 동작 가능 → raw SQL로 last_seen_at만 건드림 |
| 기존 사용자가 `last_seen_at = NULL`로 표시되어 MAU 누락 | NULL은 의도된 미활성 상태. backfill 안 함. 새 활동부터 카운트. |
| 마이그레이션이 Cloud Run revision과 race | 컨테이너 start 시 `prisma migrate deploy`가 advisory lock 사용해 안전 (기존 deploy 패턴) |

## 범위 외

- 세션 분석, retention 코호트, 활성도 분포 — 본격 BI는 별도 plan
- 사용자 노출용 "함께하는 팬 X명" 위젯 — 사용자가 비공개 결정. 추후 마음 바뀌면 별도 plan에서 `/stats/global` 추가
- 카카오 access_token 만료/refresh 추적 — 본 plan 범위 외
