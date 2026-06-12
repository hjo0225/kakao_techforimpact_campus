# Plan: 프로필 탭 다회용기 인증 기록 카드("나의 기여") 완전 제거 + 백엔드 /stats 모듈 삭제

## 배경
프로필 탭의 "나의 기여" 카드(누적 인증 / 줄인 용기 / 폐기물 감량)를 UI에서 삭제하고,
이 카드만을 위해 존재하는 데이터 파이프라인(프론트 stats 상태 + 백엔드 `/stats/*` API)도 함께 제거한다.

## 영향 범위 조사 결과
- `GET /stats/me`, `GET /stats/me/logs`의 프론트 소비처는 `AppContext`가 유일하고,
  AppContext의 stats 파생값(`totalCertCount`, `ecoImpact`) 소비처는 ProfileScreen "나의 기여" 카드가 유일.
- `certificationLogs` / `todayMission` / `reusableUseCount` / `reusableReturnCount` / `shareCardShared`는
  AppContext 내부에서만 서로를 참조할 뿐 외부 소비처 없음 → 동반 제거.
- `addCertification`은 VisitCard 인증 성공 시 stats 낙관 갱신용 → stats 제거로 무의미, 동반 제거.
- 캘린더의 "다회용기 인증" 탭은 별도 API(`getVerificationHistory`) 사용 → **범위 밖, 유지**.
- 백엔드 `StatsService`는 stats 모듈 내부에서만 사용 → 모듈 전체 삭제 가능.

## 변경 사항

### 문서 (코드보다 먼저)
- `docs/api-spec.md` — `## Stats` 섹션(`GET /stats/me`, `GET /stats/me/logs`) 삭제, `/usages/me` 항목의 stats 언급 정리
- `docs/PRD.md` — F5에서 `GET /stats/me` 행 제거/문구 갱신
- `docs/ARCHITECTURE.md` — 모듈 표에서 `stats/` 행 삭제
- `docs/runbooks/user-metrics.md` — `/stats/me` 언급 문구 갱신
- `CHANGELOG.md` — API 제거 기록

### Frontend
- `ProfileScreen.tsx` — "나의 기여" 카드 블록 삭제, `totalCertCount`/`ecoImpact` 사용 제거
- `AppContext.tsx` — stats 상태/파생값 전부 제거: `statsApi` import, `stats`, `certificationLogs`,
  `addCertification`, `refreshStats`, `todayMission`, `reusableUseCount`, `reusableReturnCount`,
  `totalCertCount`, `ecoImpact`, `shareCardShared`, 관련 타입(`CertificationLog`, `CertificationType`,
  `MissionProgress`, `EcoImpact`), `formatRelativeTime`/`mapUsageLog` 헬퍼.
  유지: `selectedTeam`, `cameraPurpose`, `registerCameraAction`/`triggerCameraAction`, `captureMode`
- `VisitCard.tsx` — `addCertification` 구조분해 및 호출(인증 성공 시) 제거
- `frontend/src/lib/statsApi.ts` — 파일 삭제

### Backend
- `backend/src/stats/` 디렉터리 전체 삭제 (controller, service, module, spec)
- `backend/src/app.module.ts` — `StatsModule` import/등록 제거

## 테스트 / 검증
- 삭제 위주 변경이라 신규 테스트 없음. 삭제되는 `stats.service.spec.ts` 외 잔존 테스트 영향 없음 확인
- `./scripts/verify.sh` 통과 (typecheck + lint + test + build)

## 수용 기준
- [ ] 프로필 탭에 "나의 기여" 카드 미노출 (프로필/응원팀/튜토리얼/로그아웃만 남음)
- [ ] 프론트에서 `/stats/*` 호출 코드 0건
- [ ] 백엔드에 `/stats/*` 라우트 없음
- [ ] verify.sh 통과
