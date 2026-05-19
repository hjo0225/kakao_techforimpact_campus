# 유저 메트릭 운영 SQL

관리용 집계 쿼리 모음. 사용자에게는 노출하지 않는다. Cloud SQL 콘솔 또는 `psql`/`gcloud sql connect`로 직접 실행.

## 데이터 소스

- `users.created_at` — 가입 시각 (account 생성)
- `users.last_seen_at` — 마지막 인증된 API 호출 시각. JWT 검증 시 5분 throttle로 갱신 (`backend/src/auth/jwt.strategy.ts`)

`last_seen_at`은 nullable. 신규 컬럼 도입 이전 사용자는 NULL이며, 활동이 발생하면 채워진다.

## 누적 가입자

```sql
SELECT COUNT(*) AS total_users FROM users;
```

## 신규 가입 (일별, 최근 30일)

```sql
SELECT DATE(created_at) AS day, COUNT(*) AS new_users
FROM users
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

## DAU (오늘)

```sql
SELECT COUNT(*) AS dau_today
FROM users
WHERE last_seen_at >= CURRENT_DATE;
```

## DAU (최근 30일, 일별)

```sql
SELECT DATE(last_seen_at) AS day, COUNT(*) AS dau
FROM users
WHERE last_seen_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

## WAU (최근 7일)

```sql
SELECT COUNT(*) AS wau
FROM users
WHERE last_seen_at >= NOW() - INTERVAL '7 days';
```

## MAU (최근 30일)

```sql
SELECT COUNT(*) AS mau
FROM users
WHERE last_seen_at >= NOW() - INTERVAL '30 days';
```

## 팀별 활성 사용자 (최근 30일)

```sql
SELECT team_code, COUNT(*) AS active_users
FROM users
WHERE last_seen_at >= NOW() - INTERVAL '30 days'
  AND team_code IS NOT NULL
GROUP BY team_code
ORDER BY active_users DESC;
```

## 가입 후 활동 여부 (퍼널 1단계)

```sql
SELECT
  COUNT(*) FILTER (WHERE last_seen_at IS NULL) AS never_active,
  COUNT(*) FILTER (WHERE last_seen_at IS NOT NULL) AS at_least_once_active,
  COUNT(*) AS total
FROM users;
```

## 주의

- `last_seen_at`는 JWT 검증을 통과한 API 요청에서만 갱신된다. 즉 카카오 로그인만 하고 인증된 API를 한 번도 호출하지 않은 사용자는 NULL로 남음. 현재 흐름상 로그인 직후 `/users/me`/`/stats/me`가 호출되므로 실질적으로는 모든 활성 사용자에서 채워진다.
- 5분 throttle로 인해 같은 사용자의 빠른 연속 호출은 1번만 카운트됨. DAU 계산엔 영향 없음.
- 토큰이 7일 유효이므로 동일 디바이스에서 7일간 재접속은 카카오 인증 없이도 가능 — DAU/MAU는 "디바이스에 토큰이 살아있고 활동한 사용자"로 해석.
