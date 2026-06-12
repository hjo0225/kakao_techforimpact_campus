# Plan: 게이미피케이션 제거 + BeReal 네비 리디자인

## 목표 (사용자 확정)
리그/포인트/경기선택을 제거하고, 하단 네비를 BeReal 레퍼런스로 재구성. 인증은 항상 사용 가능.

## 확정 스코프
- **제거 (FE+BE)**: 리그/랭킹, 포인트, 경기선택/attendance
- **인증(report)**: `requiresGame` 게이트 제거 → 항상 사용 가능
- **하단탭 (BeReal)**: 홈 · 지도 · **[중앙 카메라 = 인증]** · 캘린더 · 프로필
- **캘린더**: 날짜별 인증 기록 + **인증 사진** (GCS 이미지 서빙 신규 엔드포인트)
- **프로필**: 최소(닉네임/팀/로그아웃)
- **홈**: 카메라 용도 토글 (인증 ↔ 직관카드)
- **폰트**: 전체 Pretendard (Galmuri 제거)

## 단계
1. **chore(design)**: 폰트 토큰 Pretendard 전환 (`design-system.css` + `DESIGN.md`)
2. **backend 제거**: rankings 모듈, attendance 모듈(+Attendance 테이블 drop 마이그레이션), stats `points` 제거. app.module 정리.
3. **backend 추가**: `GET /verify/history`(유저 인증 샘플 날짜+라벨+이미지 메타) + `GET /verify/history/:id/image`(GCS 스트리밍, JWT+소유자) — 캘린더 사진용.
4. **frontend 제거**: RankingScreen, GameSelectScreen, rankingsApi, attendanceApi, points 필드, AppContext의 selectedGame/selectGame/attendance/points 정리, LockedScreen.
5. **frontend 네비**: BottomNav BeReal 재구성(중앙 FAB), routes(navigation.tsx/App.tsx) 정리.
6. **frontend 화면**: CalendarScreen(사진), ProfileScreen(최소), ReportScreen 게이트 제거, HomeScreen 카메라 토글(인증/직관카드) + 리그/경기선택 UI 제거.
7. **직관카드(가정)**: 홈 토글로 카메라 목적 전환. 직관카드 = 사진 1장 캡처 → 카드 표시(캘린더에 함께 노출). 상세는 구현 중 확정.
8. **검증**: typecheck + lint + build + test, 로컬 seed/마이그레이션.

## 메모
- `usages.score` 컬럼은 verify 흐름이 여전히 기록하므로 즉시 drop하지 않고 points 노출만 제거(내부 데이터 유지). 완전 제거는 후속.
- 브랜치: `feat/strip-gamification-bereal-nav`. tsconfig 수정(PR #16)과는 독립.
