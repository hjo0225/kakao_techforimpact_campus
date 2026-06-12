# PRD — 용기낼깡

> 제품 요구사항 문서. 새 기능 / 사용자 흐름 / 수용 기준 추가 시 여기를 먼저 갱신.

## Vision

야구장 다회용기 사용을 게이미피케이션하여 일회용기 사용을 줄인다. 사용자는 다회용기를 사용·반납할 때 사진을 찍어 AI 이미지 분류로 인증하고, 인증당 점수를 받아 응원 팀별 누적 랭킹에 기여한다.

## Personas (TBD — 사용자 인터뷰 후 보강)

- **P1: 야구 직관러** — 시즌권 보유, 응원팀에 강한 정체성
- **P2: 환경 관심자** — 일회용 줄이기 동기 강함

## Success Metrics (TBD)

- DAU / WAU (`users.last_seen_at` 기반, [`docs/runbooks/user-metrics.md`](runbooks/user-metrics.md))
- 인증 수 / DAU 비율 (`usages` 테이블)
- 팀별 평균 누적 점수
- 다회용기 회수율 (USE 대비 RETURN 비율)

---

## 핵심 기능 (현재 구현 상태)

### F1. 카카오 로그인 ✅ 구현됨
- 카카오 OAuth code → 백엔드 JWT 발급 (HS256, 7일)
- 자동 회원가입 (kakao_id를 식별자로, DB user.id가 JWT `sub`)
- 로그아웃 시 카카오 세션도 종료 (`logout_redirect_uri`로 이동)

**수용 기준**:
- [x] 카카오 로그인 → JWT 받아서 메인 진입
- [x] 첫 로그인 시 팀 선택 화면 강제 (`PrivateLayout`이 `user.teamCode` 없으면 `/onboarding`으로 리다이렉트)
- [ ] JWT 만료 처리 (refresh 흐름 — 미구현, 만료 시 강제 재로그인)

### F2. 팀 선택 (온보딩) ✅ 구현됨
- 사용자가 응원 팀을 1개 선택 (KBO 10개 팀)
- `PATCH /me/team`으로 백엔드 저장 (`teams.code` FK)
- 화면: `TeamSelectScreen` → 첫 로그인 시 강제 진입

> **변경 (2026-05)**: 아바타 커스터마이즈는 범위에서 제외. `app/avatar.ts`, `AvatarFigure`, `AvatarCustomizeScreen`, `AccountScreen` 모두 제거됨. 팀-only 온보딩으로 전환 — 이유: 핵심 가설(팀 경쟁 = 동기) 검증 단계에서 아바타 의상 다양성은 학습 부담. ([`refactor-onboarding-team-only.md`](plans/active/refactor-onboarding-team-only.md))

### F3. Vision AI 이미지 인증 (USE / RETURN) ✅ 구현됨
> **계획 변경 (2026-05)**: QR 스캔 방식에서 **이미지 분류 인증**으로 전환. 운영사 QR 포맷 협의 의존성을 제거하고, 사용자가 다회용기 사진만 찍으면 자체 모델이 판별.

- **모델**: MobileNetV2 2-class (`reusable` / `single_use`), `vision/best_model.pth`
- **인프라**: 별도 Cloud Run 서비스(`cleanballtrio-vision`, FastAPI), NestJS만 server→server 호출
- **엔드포인트**: `POST /verify/use`, `POST /verify/return` (multipart, JWT)
- **검증 기준**: `isReusable === true` **그리고** `confidence ≥ 70` → 통과
- **점수**: USE = 50점, RETURN = 100점 (`usages.score`)
- **반납 가드**: RETURN은 같은 사용자의 최근 12시간 이내 USE가 있어야 함 (없으면 409 `NO_RECENT_USE`)

**수용 기준**:
- [x] 사진 업로드 → Vision 분류 → 통과 시 `usages` 적재 + 점수 부여
- [x] 신뢰도 낮음 / 일회용 판별 시 명확한 에러 코드 반환
- [x] 반납 인증 가드 (USE 없이 RETURN 차단)
- [ ] 모델 정확도 측정 / 운영 데이터 기반 재학습 루프

### F4. 팀별 누적 랭킹 ✅ 구현됨 (Redis는 예정)
- **현재**: `GET /rankings/teams` — PostgreSQL aggregate (`teams LEFT JOIN users LEFT JOIN usages GROUP BY`) 매 요청 1쿼리
- 점수 0인 팀도 포함 (항상 10행), 정렬 `totalPoints DESC, teamCode ASC`
- 화면: `RankingScreen` (응원팀 강조, 누적 인증·줄인 용기 표시)
- **예정**: Redis ZSET(`ranking:teams:season:{year}`)로 전환 — 사용자/usage 행 수 증가 시 응답 지연 발생 시점에 도입

**수용 기준**:
- [x] 팀 10개 모두 항상 노출
- [x] 점수 동률 시 결정적 정렬
- [ ] 실시간 갱신 (현재는 화면 진입 시 1회 fetch)

### F5. 사용자 통계 / 공유 이미지 ✅ 구현됨 (등급은 폐기, 통계 API는 제거)
- 화면: `RecordScreen` (감축 기여 대시보드 / 직관 달력 / 공유 카드 3-탭)
- 공유 카드: Canvas 2D로 Instagram story(1080×1920) / feed(1080×1080) 이미지 생성

> **변경 (2026-05)**: 등급(`app/ecoGrades.ts`) 폐기 — MVP에서는 등급 임계값 산정 근거가 부족하고, 점수 자체가 이미 충분한 진척도 표현. 향후 데이터 누적 후 재도입 검토.

> **변경 (2026-06-12)**: 프로필 "나의 기여" 카드(누적 인증·줄인 용기·폐기물 감량) 제거. 유일 소비처가 사라져 `GET /stats/me`·`GET /stats/me/logs` API도 함께 폐기.

**수용 기준**:
- [x] 인증 0건 신규 사용자도 0 반환 (NaN/null 없음)
- [x] 공유 카드 다운로드 (`yonggi-naelkkang-{format}.png`)
- [ ] 서울 야구장 일회용품 감축 기여도 시각화 ([`feat-dashboard-seoul-contribution.md`](plans/active/feat-dashboard-seoul-contribution.md))
- [ ] 사용·반납 페어 매칭 통계 정합성 ([`fix-stats-paired-containers.md`](plans/active/fix-stats-paired-containers.md))

### F6. 지도 — 다회용기 매장 + 메뉴 ✅ 구현됨 (재설계)
- 구장 내부 매장(다회용기 사용 가능) + 외부 협력 식당 2개 탭
- 매장별 메뉴 리스트 (이름·가격·이모지 아이콘)
- 좌석 기준 거리 계산
- 화면: `MapScreen` ([`feat-map-stores-menu.md`](plans/active/feat-map-stores-menu.md))

> **변경 (2026-05)**: 반납함 안내(파란 핀, 추천 카드, 좌석 동선 폴리라인, 2층/3층 층 선택기) **모두 제거**. 반납 인증 동선은 F3가 담당하므로 지도는 "어디서 다회용기로 먹을 수 있는가"에만 집중. Kakao Maps JS API는 도입 보류 (구장 내부 좌표 정밀도 한계).

**수용 기준**:
- [x] 매장 → 메뉴 1depth로 도달
- [ ] 매장/메뉴 데이터를 운영사 협의로 실데이터 연결 (현재 mock)

### F7. 디자인 시스템 (Vintage + Pixel) ✅ 구현됨
- **랜딩**: 빈티지 야구장 일러스트(`landing-bg.png` + `landing-logo.svg`) 풀스크린 + 카카오 floating CTA
- **앱 전체**: cream / burgundy / rose 팔레트 + NES.css 스타일 (Galmuri 한글 픽셀 폰트, 2px solid burgundy 테두리, hard offset shadow, 0 radius)
- 디자인 토큰 SSOT: [`DESIGN.md`](../DESIGN.md)

---

## 우선순위 (현재 작업 큐)

이 섹션은 빠르게 변하므로 가벼운 상태 유지:

1. **F5 통계 정합성** — 사용·반납 페어 매칭 ([`fix-stats-paired-containers.md`](plans/active/fix-stats-paired-containers.md))
2. **F5 대시보드** — 서울 야구장 감축 기여도 시각화 ([`feat-dashboard-seoul-contribution.md`](plans/active/feat-dashboard-seoul-contribution.md))
3. **운영 지표** — DAU/MAU 추적 ([`feat-user-count-metrics.md`](plans/active/feat-user-count-metrics.md))
4. **F4 Redis** — 사용자 수 증가 시 ranking 응답 지연 발생하면 ZSET 전환
5. **F3 모델 개선** — 운영 인증 데이터로 재학습 루프

세부 plan: [`docs/plans/active/`](plans/active/)

---

## Out of Scope (현재 단계)

- 결제 / 인앱 구매
- 알림 (push) — 후순위
- 친구/소셜 기능
- 다국어
- iOS/Android 네이티브 (WebView 래핑으로 진행)
- 아바타 커스터마이즈 (F2 변경으로 폐기)
- 사용자 등급 (F5 변경으로 폐기)

---

## Open Questions

- [ ] 점수 산정 알고리즘 재검토 (USE 50 / RETURN 100 고정이 적절한가, 시간대 보너스?)
- [ ] 시즌 리셋 정책 (랭킹을 시즌별로 끊을지, 영구 누적인지)
- [ ] Vision 모델 오판 시 사용자 피드백 채널 (현재는 단순 에러)
- [ ] 매장/메뉴 데이터 운영사 협의 (실데이터 연결)
