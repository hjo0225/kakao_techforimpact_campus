# Plan: 튜토리얼(온보딩) 화면 추가 + 팀선택 화면 제거

## 목표 (사용자 확정)
신규 유저에게 핵심 흐름(지도→인증→직관카드→기록)을 알려주는 4단계 풀스크린 튜토리얼을 추가한다. 매 로그인 시 노출되고 "다시 안보기"로 영구 해제. 기존 강제 팀선택 화면(TeamSelectScreen)은 완전 제거하고 팀 선택을 프로필로 이전한다. 각 단계 비주얼은 실제 앱 화면 스크린샷을 사용한다.

## 확정 스코프
- **제거**: `/onboarding` 라우트 + TeamSelectScreen. App.tsx의 team 게이트, navigation의 `onboarding`, OAuthCallback의 hasTeam 분기.
- **팀선택 이전**: ProfileScreen에 응원팀 카드 + 변경 모달(기존 `cb-team-grid`/`TeamBadge`/`setTeam` 재활용). VisitCard는 `user.teamCode ?? undefined`로 미설정 허용(서버 기본 프레임).
- **튜토리얼 상태**: `store/tutorialStore.ts` (persist `dismissed` + 세션 `pendingShow`). 액션 requestShow/close/dismissForever/reopen.
- **트리거**: 로그인 성공 직후(OAuthCallback + LoginPage dev 경로) `requestShow()`.
- **오버레이**: `app/components/tutorial/TutorialOverlay.tsx`. 4슬라이드(스크린샷+제목+설명), 스와이프 + 점 인디케이터 + 다음/시작하기 + "다시 안보기". `motion` 패키지 전환 애니메이션, `prefers-reduced-motion` 존중. App.tsx PrivateLayout에 전역 마운트.
- **프로필**: "튜토리얼 다시 보기" 버튼 → reopen().
- **스크린샷**: puppeteer + API 요청 가로채기(목 데이터) + 지도키(`frontend/.env`, 비커밋)로 캡처 → `assets/tutorial/{map,verify,card,record}.png`. (백엔드 로컬 DB 미가동이라 DB 대신 목킹.)
- **디자인**: 점 인디케이터 토큰을 DESIGN.md에 먼저 추가(별도 chore(design) 커밋). 토큰만 사용.

## 4단계
1. 지도 — 다회용기 가능 매장 찾기
2. 인증 — 사용/반납 사진 AI 인증
3. 직관카드 — 직관 사진 카드 공유
4. 기록 — 캘린더/프로필에서 내 기여 확인

## 검증
- 단위: tutorialStore, TutorialOverlay 렌더/다시안보기, Profile 팀변경.
- 수동 E2E: 로그인→자동 노출, 재로그인 재노출, 다시안보기 후 미노출+프로필 재노출, /onboarding 미진입, 팀변경 반영.
- `./scripts/verify.sh` 통과.

## 메모
- 브랜치: `feat/tutorial-onboarding`.
- 카카오맵 SDK는 Web 도메인(localhost:5173) 등록 필요. 지도/카메라 스크린샷이 로컬에서 안 나오면 실기기 캡처로 대체.
