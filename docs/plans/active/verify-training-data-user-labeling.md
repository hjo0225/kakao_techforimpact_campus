# Plan: 인증 학습데이터 적재 + 유저 라벨링(휴먼인더루프)

## 배경 / 목표

현재 다회용기 인증은 Vision API가 `isReusable && confidence ≥ 70`이면 통과시키고, 이미지는
forward 후 버려진다. `usages`에는 `confidence`만 남아 모델 재학습에 쓸 데이터가 없다.

목표 2가지:
1. **학습데이터 적재**: 어떤 방식으로 판별하든 (AI/유저) 모든 인증 시도를 이미지 + AI 예측 +
   유저 라벨 + 메타와 함께 DB에 영구 저장.
2. **유저 직접 라벨링(휴먼인더루프)**: AI가 먼저 예측해 보여주고, 유저가 다회용기/일회용기
   라벨을 확정. 유저 라벨이 점수/통과를 결정.

## 결정사항 (사용자 확인 완료)

- **이미지 저장**: GCS 버킷에 원본 저장, DB에는 `gs://` 경로 + sha256 해시.
- **라벨링 방식**: AI 예측 + 유저 확정. AI 예측·유저 라벨 둘 다 저장.
- **통과 기준**: 전부 기록. 유저 라벨이 `REUSABLE`이면 통과/점수 부여. AI 불일치·저신뢰도여도
  기록은 유지. (RETURN의 "직전 12시간 USE 필요" 가드는 점수 부여 단계에서 유지 — 위반 시
  샘플은 기록하되 점수 미부여 + `NO_RECENT_USE`.)

## API 변경 (기존 2개 → 2단계 흐름)

- 제거: `POST /verify/use`, `POST /verify/return`
- 추가:
  - `POST /verify/analyze` (multipart): `image`, `kind`(USE|RETURN), `gameId?`, `lat?`, `lng?`
    → GCS 업로드 + Vision 예측(best-effort) + `verification_samples`에 PENDING 적재
    → `{ sampleId, ai: {isReusable,classIndex,confidence}|null, suggestedLabel }`
  - `POST /verify/confirm` (json): `{ sampleId, userLabel: REUSABLE|SINGLE_USE }`
    → 라벨 확정(CONFIRMED). REUSABLE이면 `usages` 점수 행 생성·연결. SINGLE_USE면 음성 샘플로만 기록.
    → `{ sample, scored, usage?, score }`

## DB (DATA_MODEL.md 동시 갱신)

새 테이블 `verification_samples` + enum `ContainerLabel(REUSABLE|SINGLE_USE)`,
`SampleStatus(PENDING|CONFIRMED)`. `usage_id`로 점수 행과 1:1 연결(nullable).
마이그레이션: `20260601000000_add_verification_samples`.

## 작업 항목

### Backend
- [ ] `prisma/schema.prisma` — enum 2개 + `VerificationSample` 모델 + User/Game/Usage 관계
- [ ] `prisma/migrations/20260601000000_add_verification_samples/migration.sql`
- [ ] `src/storage/storage.service.ts` + `storage.module.ts` — GCS 업로드(sha256, gs:// 경로)
- [ ] `src/verify/dto/verify.dto.ts` — `AnalyzeDto`(+kind), `ConfirmDto`
- [ ] `src/verify/verify.service.ts` — `analyze()` + `confirm()`
- [ ] `src/verify/verify.controller.ts` — `/analyze`, `/confirm`
- [ ] `src/verify/verify.module.ts` — StorageModule import
- [ ] `package.json` — `@google-cloud/storage`
- [ ] `.env.example` — `GCS_TRAINING_BUCKET`
- [ ] `verify.service.spec.ts` — analyze/confirm 테스트 갱신

### Frontend
- [ ] `src/lib/verifyApi.ts` — `analyzeImage()`, `confirmLabel()`
- [ ] `src/app/components/screens/ReportScreen.tsx` — 라벨링 단계 UI(AI 제안 + 유저 확정)

### Docs
- [ ] `docs/DATA_MODEL.md` — `verification_samples` 추가
- [ ] `docs/api-spec.md` — verify 섹션 교체
- [ ] `CHANGELOG.md` — 항목 추가

## 검증
`./scripts/verify.sh` (typecheck + lint + build + test). GCS는 단위테스트에서 StorageService 목.
