# PRD — 용기낼깡

> 제품 요구사항 문서. 새 기능 / 사용자 흐름 / 수용 기준 추가 시 여기를 먼저 갱신.
> **코드가 SSOT** — 명세와 코드가 어긋나면 이 문서를 먼저 고친다.

## Vision

야구장 다회용기 사용을 **직관 기념 카드(야구네컷)** 라는 보상으로 게이미피케이션해 일회용기 사용을 줄인다.
핵심 메커니즘은 한 문장 — **"다회용기를 인증해야, 그날의 야구네컷 카드를 만들 수 있다."** 현금성 보상이 아니라 직관의 추억을 굿즈로 남기고 싶은 욕구를 동기로 활용한다.

## Personas (TBD — 사용자 인터뷰 후 보강)

- **P1: 야구 직관러** — 시즌권 보유, 응원팀에 강한 정체성, 직관 인증샷/굿즈에 관심
- **P2: 환경 관심자** — 일회용 줄이기 동기 강함

## Success Metrics (TBD)

- DAU / WAU (`users.last_seen_at` 기반, [`docs/runbooks/user-metrics.md`](runbooks/user-metrics.md))
- 인증 수 / DAU 비율 (`usages` 테이블)
- 인증 → 카드 생성 전환율 (`usages` → `visit_cards`)
- 다회용기 사용 인증 추세 (`usages` USE 건수)

---

## 핵심 기능 (현재 구현 상태)

> 아래는 **프로덕션(cleanballtrio.web.app)에 실제 반영된 흐름** 기준이다.

### F1. 카카오 로그인 ✅ 구현됨

- 카카오 OAuth code → 백엔드 JWT 발급 (HS256, 7일)
- 자동 회원가입 (`kakao_id`로 upsert, JWT `sub` = DB `user.id`)
- 로그인 직후 곧바로 홈 진입 (**별도 온보딩/팀 선택 강제 없음**)
- WebView는 네이티브 카카오 SDK access_token을 받아 백엔드와 교환

**수용 기준**:
- [x] 카카오 로그인 → JWT 받아서 홈 진입
- [ ] JWT 만료 처리 (refresh 흐름 — 미구현, 만료 시 강제 재로그인. `isTokenExpired`로 사전 차단만)

### F2. 다회용기 AI 인증 (USE) ✅ 구현됨

홈의 통합 카메라에서 **용기인증 모드**로 촬영 → AI 판별 → 사용자 확정의 2단계 흐름.

- **모델**: MobileNetV2 2-class (`reusable` / `single_use`), `vision/best_model.pth`
- **인프라**: 별도 Cloud Run(`cleanballtrio-vision`, FastAPI + PyTorch), NestJS만 server→server 호출
- **엔드포인트**:
  - `POST /verify/analyze` (multipart) — 이미지를 GCS 적재 + Vision 예측 → `PENDING` 샘플 생성
  - `POST /verify/confirm` — 사용자가 정답 라벨 확정 → `REUSABLE`이면 `usages` 적재
  - `GET /verify/history`, `GET /verify/history/:id/image` — 캘린더용 본인 인증 이력/이미지
- **현재 범위**: 앱은 **USE 인증만** 수행 (`vMode = 'use'`). RETURN(반납) 인증은 UI에서 제거 — 백엔드 로직(12h USE 가드, RETURN 점수)은 남아있으나 미노출
- **점수**: `usages.score`에 적재되지만 **사용자에게 노출하지 않음** (랭킹/점수 화면 없음)

**수용 기준**:
- [x] 사진 업로드 → Vision 분류 → 사용자 확정 → `usages` 적재
- [x] 일회용기 판별 시 점수 미부여 + 음성 샘플로 학습 데이터화
- [ ] 모델 정확도 측정 / 운영 데이터 기반 재학습 루프

### F3. 야구네컷 직관 카드 ✅ 구현됨 (공유 링크는 미노출)

인증을 마치면 그날의 카드가 열리는 **인증 게이트** 구조.

- **게이트**: 오늘 `CONFIRMED` 인증 이력이 있으면 **그날 24시까지** 야구네컷 모드 해제. 기준은 **서버 이력이 진실**(로컬 `verify-gate`는 보조 캐시)
- **카드 생성**: 같은 카메라에서 야구네컷 모드로 전환 → 구단별 프레임 선택 → 직관 사진을 슬롯에 채워 Canvas로 합성 → 저장 (`visit_cards`)
- **공유**: 백엔드 `shareToken` + `/card/:token` 공개 페이지가 **코드에는 존재하나 현재 프로덕션 미노출** (백로그)

**수용 기준**:
- [x] 오늘 인증 전에는 잠금 화면("용기 인증 후에 이용 가능해요") 노출
- [x] 인증 후 프레임 선택 → 사진 합성 → 저장 (`야구네컷_{n}.png`)
- [ ] 카드 공유 링크 노출 여부 결정 (백로그)

### F4. 지도 — 구장 다회용기 매장 + 메뉴 ✅ 구현됨

- Kakao Maps 위에 구장 내부/협력 매장 + 메뉴(이름·가격) 표시
- 구장 층(1F~4F) 선택, 카테고리/구단/게이트 필터
- 화면: `MapScreen`

**수용 기준**:
- [x] 매장 → 메뉴 도달
- [ ] 매장/메뉴 운영사 실데이터 연결 (일부 mock)

### F5. 캘린더 — 직관 일정 + 인증 이력 ✅ 구현됨

- 월별 KBO 일정(`games`)과 본인 인증 이력(`/verify/history`)을 함께 표시
- 화면: `CalendarScreen`

**수용 기준**:
- [x] 월 이동 + 인증 이력 표시
- [ ] 인증 이력 ↔ 직관 일정 매칭 정합성

### F6. 프로필 ✅ 구현됨

- 닉네임, 응원팀(`teamCode`) 표시, 튜토리얼 다시 보기, 로그아웃
- 화면: `ProfileScreen`

### F7. 매장 관리 (admin) ✅ 구현됨 — 내부 도구

- `/admin/stores` — 매장/메뉴/슬롯/운영규칙 관리. 일반 사용자 대상 아님
- 화면: `AdminStoresScreen`, 백엔드 `admin/` 모듈

### F8. 디자인 시스템 (Vintage + Pixel) ✅ 구현됨

- 랜딩: 빈티지 야구장 일러스트 풀스크린 + 카카오 floating CTA
- 앱 전체: cream / burgundy / rose 팔레트 + NES 스타일 (Galmuri 픽셀 폰트)
- 디자인 토큰 SSOT: [`DESIGN.md`](../DESIGN.md)

---

## Out of Scope (현재 단계)

- **팀 경쟁 / 누적 랭킹 / 점수 노출** — 데이터 축적 후 재검토할 백로그 (현재 사용자 노출 없음)
- **온보딩 팀 선택 강제** — 폐기. 팀은 프로필/카드 프레임으로만 사용
- **RETURN(반납) 인증** — UI에서 제거 (백엔드 로직만 잔존)
- **카드 공유 링크** — 코드 존재하나 미노출
- 결제 / 인앱 구매, push 알림, 친구/소셜, 다국어
- iOS/Android 네이티브 (WebView 래핑으로 진행)

---

## Open Questions

- [ ] 점수(`usages.score`) 활용처 — 랭킹/뱃지로 노출할지, 내부 지표로만 둘지
- [ ] 카드 공유 링크를 프로덕션에 노출할지
- [ ] Vision 모델 오판 시 사용자 피드백 채널 (현재는 단순 에러 + 사용자 라벨 확정)
- [ ] 매장/메뉴 데이터 운영사 협의 (실데이터 연결)
