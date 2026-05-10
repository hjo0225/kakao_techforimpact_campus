# Plan: 첫 로그인 시 KBO 팀 선택 (프론트엔드 전용 단계)

## 목표

카카오 로그인 후, **계정별 첫 진입**이면 팀 선택 온보딩 화면(`TeamSelectScreen`)으로 강제 이동 → 팀 선택 → localStorage(zustand persist)에 영구 저장. 두 번째 로그인부터는 곧장 홈으로.

> 백엔드/DB 도입은 본 plan에서 제외. 추후 별도 plan에서 `users.team_code` 컬럼 + `PATCH /me/team` 엔드포인트로 이전.

## 결정 사항 (확정)

- **저장 위치**: `authStore`(zustand `persist`)에 `teamsByUserId: Record<number, string>` 맵으로 보관. user.id로 인덱싱하여 같은 브라우저에서 다른 카카오 계정으로 로그인해도 분리됨.
- **첫 로그인 판별**: `teamsByUserId[user.id]`가 `undefined`면 첫 진입.
- **TeamSelectScreen은 그대로 사용**: 기존 슬라이드 → 팀 선택 → 권한 화면 흐름 유지. 완료 시 `setTeam(team)` 호출 추가.
- **라우팅 가드**: `PrivateLayout`에서 토큰 + 팀 미선택 + path !== `/onboarding`이면 `/onboarding`으로 redirect.
- **AppContext.selectedTeam은 유지**: 화면 단위 임시 상태로는 그대로 두고, authStore가 SSOT. AppProvider 마운트 시 authStore에서 hydrate.

## 흐름

```
1. /login → 카카오 로그인
2. /oauth/callback → POST /auth/kakao → setAuth(user, token)
3. teamsByUserId[user.id] 존재? → /home : /onboarding
4. /onboarding → 팀 선택 → setTeam(teamName) → /home
5. 다음 로그인부터는 3에서 곧장 /home
```

## 범위 (체크리스트)

- [ ] `authStore.ts`: `teamsByUserId`, `setTeam`, `getTeamFor(userId)` 추가. logout 시는 맵 유지(기기 변경/계정 전환 대비).
- [ ] `OAuthCallbackPage.tsx`: setAuth 직후 팀 존재 여부 확인하여 `/home` 또는 `/onboarding`으로 분기.
- [ ] `TeamSelectScreen.tsx`: `handleStart()`에서 authStore.setTeam(selected) 호출. 기존 AppContext.setSelectedTeam도 유지.
- [ ] `AppContext.tsx`: 초기값을 authStore의 현재 user 팀으로 hydrate.
- [ ] `App.tsx`: `PrivateLayout`에 가드 추가 (token + no team + path !== /onboarding → redirect /onboarding). `RootRedirect`도 팀 유무로 분기.

## 범위 외

- 백엔드 user 테이블 / DB 도입
- `PATCH /me/team` 엔드포인트
- 팀별 누적 포인트 더미 (RankingScreen 단계에서 별도)
- 팀 변경 정책

## 후속 plan (예고)

- `feat-db-postgres-prisma.md` — Prisma + Cloud SQL 도입, users 테이블
- `feat-team-server-sync.md` — 본 plan의 localStorage 팀 정보를 백엔드로 이전
