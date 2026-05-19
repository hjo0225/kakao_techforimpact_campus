# 메인 대시보드 = 서울 감축 목표 기여도 (포인트/굿즈/아바타/타율 제거)

## Context

현재 앱은 사용자별 포인트 적립을 중심으로 게이미피케이션을 쌓아 올렸다:

- 포인트(P) 표시 → 등급(그린팬) → 아바타 해금(500/800/1200P) → 굿즈 응모(1500P) → 환경 타율/장타율/OPS 같은 야구 비유 지표
- 다만 운영상 이 레이어들이 본질(다회용기 사용 → 일회용품 감축)에서 멀어졌고, **서울시 야구장 일회용품 감축 목표에 내가 얼마나 기여했는가** 라는 환경 지표가 메인이어야 한다는 결정이 났다.

기존 `EcoImpact`에 이미 `seoulContributionPct` 계산이 들어 있어, 데이터 골격은 재활용 가능하다.

## 결정 사항

| 영역 | 결정 |
|---|---|
| 사용자별 포인트(P) **표시** | 모든 화면에서 제거 |
| 사용자별 포인트 상태/백엔드 호출 | 유지 (팀 랭킹 집계에 필요). UI 노출만 제거 |
| 등급(그린팬 등 5단계) | 제거 (chore/remove-grades와 중복되나 본 작업에서도 모두 끊음) |
| 아바타 기능 (꾸미기, 해금) | 제거. `AvatarCustomizeScreen`, `AvatarFigure`, `avatar.ts` 삭제. 라우트 제거 |
| 굿즈/리워드 (커피트럭, 사인볼, 에코굿즈 등) | 모두 제거 |
| 환경 타율 / 출루율 / 장타율 / OPS | 제거 |
| **새 메인 대시보드** | "서울 야구장 일회용품 감축 목표 기여" 카드 (절감량 + 기여% + 진행 바 + 메트릭) |
| 타임세일 7-8회 "2배 포인트" 카피 | 보상 카피는 제거. 인증 흐름 자체는 유지 |
| 팀 랭킹 (구단 누적 친환경 포인트) | 유지 — 팀 단위 환경 기여 지표로 해석 |
| 인증 흐름 (`addCertification`) | 유지. backend usages 적재 + 팀 랭킹 집계는 그대로 |

## 새 메인 카드 정보 구조

```
┌─────────────────────────────────────────┐
│ 서울 야구장 일회용품 감축 기여            │
│                                         │
│ 줄인 일회용기  ●●●●● (대형 숫자)        │
│ N 개          ~kg 감축 / ~kg 탄소 절감  │
│                                         │
│ 서울 시즌 목표 대비 [████░░░░░░] 0.0X% │
│                                         │
│ ┌───────┬───────┬───────┐               │
│ │ 사용  │ 반납  │ 누적  │               │
│ │ N회   │ N회   │ N건   │               │
│ └───────┴───────┴───────┘               │
└─────────────────────────────────────────┘
```

데이터 출처: `EcoImpact { containers, wasteKg, carbonKg, seoulContributionPct }` (이미 존재) + `reusableUseCount`, `reusableReturnCount`, `certificationLogs`.

> 9,800kg 기준선은 placeholder. 실제 서울시 발표 수치로 교체 시 `ecoImpact` 계산만 갱신.

## 화면별 변경

### HomeScreen
- "내 포인트 24,000P + 그린팬 + 다음 등급 X P 남음" 카드 → "서울 감축 기여" 카드
- "오늘의 미션" 카드 — 보상 뱃지 "기본 50P / 7-8회 2배 보너스" 표기 제거 → "오늘 미션 N/3" 라벨만
- "조기반납 타임세일 진행 중" 알림 — "100P 받을 수 있습니다" 문구 제거 → "조기 반납 시 인증 가속" 정도로
- "오늘 환경 기록" 카드는 유지 (줄인 용기/감량/최근 인증)

### AccountScreen
- 상단 어두운 그라데이션 카드 "환경 타격 대시보드" + 타율/출루율/장타율/OPS → **"서울 감축 기여" 메인 카드**로 교체 (동일한 dark theme 유지, 메트릭만 변경)
- 아래쪽 기존 "서울 감축 목표 기여도" white 카드는 메인과 중복되므로 통합/삭제
- "내 야구 아바타" section 통째 삭제
- 그라데이션 카드 우상단 "그린팬 그린팬" 뱃지 + "24,000 시즌 포인트" 제거
- 하단 "포인트 내역과 굿즈 교환 프로그램" → "최근 인증 기록" (record 화면으로 이동만)
- "시즌 혜택" trophy 뱃지 제거

### RecordScreen
- 서브탭 `'환경 타율'` → `'감축 기여'`
- dashboard subtab:
  - 어두운 카드의 ".620+" 환경 타율 큰 숫자 → 절감량(kg) 큰 숫자
  - "서울 목표 기여도" 우측 미니 메트릭 유지 (이미 있음)
  - "야구 아바타" 카드 통째 삭제 (홈/헬멧/장갑/배트 + 500/800/1200P 해금)
  - "포인트 내역" 카드 → "최근 인증" (`+50P/+100P` 라벨 제거, 시간/타입만)
  - "굿즈 교환소와 시즌 리워드 보기" 버튼 삭제
- calendar subtab: "환경 점수 N P" 상단 우측 카드 → "줄인 용기 N개"
- share subtab: 공유 카드 디자인의 `ecoGrade` 의존 제거 — 그 자리를 "줄인 용기 N개" 또는 "서울 감축 X%"로 교체. `createInstagramReadyImage` 입력에서 `ecoGrade` 제거

### RankingScreen
- 메인 카드 우측 카드 "내 누적 포인트 24,000 P" → 사용자별 P 비노출. 대체: "내 인증 N건" 또는 "내 감축 N개" (factCheck 가능한 수치)
- "리워드 상세 · 커피트럭/사인볼/에코굿즈" section 통째 삭제
- 팀 랭킹 본체는 유지 (구단 누적은 환경 기여 지표로 유지)

### ReportScreen
- "다회용기 인증 시 즉시 50P" 헤더 → "다회용기 인증으로 감축 기여"
- 상단 통계 3 칸 (현재 포인트, 누적 인증, 오늘 보상) → (누적 인증, 줄인 용기, 줄인 폐기물) — 포인트 비노출
- "7-8회 2x" / "기본 적립" pill → 제거 또는 "타임세일 안내"로 톤 변경
- "AI 인증 시작 (+50P)" 버튼 → "AI 인증 시작"
- 결과 카드 "즉시 50P 적립 완료" → "감축 1개 추가" 등 환경 기반 문구
- 인증 히스토리 `+50P` 표기 → 인증 성공/재촬영만
- `addCertification(mode, score)` 호출은 그대로 (백엔드 호환)

### AppContext
- `ecoGrade`, `getNextGradeInfo` 제거
- `avatarConfig`, `setAvatarConfig` 제거
- `reportCount`, `addReport`, `reportLogs`, `SAMPLE_REPORT_LOGS`, `ReportLog` type 제거 (chore와 중복 — 본 PR에서 끊는다)
- `points` 상태/`refreshStats` 유지 (백엔드 호환). UI 노출만 사라짐
- `ecoImpact` 유지

### Navigation / App
- `Route` 유니온에서 `'avatar'` 제거
- `ROUTE_PATHS.avatar` 제거
- `App.tsx`의 `AvatarCustomizeScreen` lazy import + `/avatar` route 제거

### 삭제
- `frontend/src/app/avatar.ts`
- `frontend/src/app/components/AvatarFigure.tsx`
- `frontend/src/app/components/screens/AvatarCustomizeScreen.tsx`
- `frontend/src/app/ecoGrades.ts`

## 변경 없음

- 백엔드 (stats/usages/rankings API 그대로) — `getMyStats` 응답의 `points`는 더 이상 화면에 표시 안 되지만 팀 랭킹 집계에 필요
- `lib/statsApi.ts` (시그니처 유지)
- `MapScreen.tsx` (직전 PR에서 이미 작업됨)
- 팀 랭킹 본체

## 검증

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- 수동: Home → Map → Report → Record → Ranking → MY 한 바퀴, 포인트(P)/타율/아바타/굿즈 노출 0건 확인

## 위험 & 완화

| 위험 | 완화 |
|---|---|
| `points` UI는 숨겼지만 backend가 여전히 갱신 → 데이터 의미 불일치 | 본 PR 범위 외. 추후 backend에서 `points` 컬럼 제거 시 별도 plan |
| `getMyStats`가 `points` 외 필드를 안 줘서 "줄인 용기 N개" 표기가 로컬 카운트(`certificationLogs.length`)에 의존 → 로그아웃/리로드 시 0 | 백엔드에서 `usagesCount`/`returnsCount` 노출 필요. 우선 로컬 값 유지, 추후 백엔드 확장 plan |
| 공유 카드 디자인이 ecoGrade를 시각 강조 요소로 쓰고 있어 빈자리 발생 | "줄인 용기 N개" 텍스트로 자연 교체 |

## 범위 외

- `points` 컬럼/`stats` 응답에서 P 제거 (별도 plan, 백엔드 마이그레이션 동반)
- 서울시 감축 목표 실제 수치 확정 (현재 9800kg 자리표시자)
- 공유 카드 전면 리뉴얼
