# feat: Vision 인증을 usages 적재 + 점수 + 반납 가드

## 목표
`/verify/reusable` 단일 엔드포인트(검증만)를 `/verify/use`·`/verify/return` 두 개로 쪼개고,
검증 통과 시 `usages` 테이블에 기록 + 점수 부여. 반납에는 시간 가드 추가.

## 결정 사항
- **score 정책**: USE=50점, RETURN=100점, confidence < 70 → 검증 실패(400) → 적재 안 함
- **반납 가드**: 같은 사용자의 가장 최근 USE가 지난 12시간 내에 있어야 RETURN 허용 (없으면 409 Conflict)
- **gameId**: optional. 프론트엔드가 현재 선택한 경기 id 전달
- **lat/lng**: optional. 첫 단계에서는 적재만, 가드는 안 함
- **기존 `/verify/reusable` 엔드포인트 제거** (1주일도 안 돼 출시됐고 적재 없는 분류는 더 이상 의미 없음)
- **점수 합산**: 별도 `points` 컬럼/뷰는 추가 안 함. 필요 시 `SUM(score) WHERE user_id = X`로 계산
- **IAM 잠금**: 본 PR 범위 외 (별도 plan에서 NestJS Cloud Run SA에 `run.invoker` 부여 + GoogleAuth IdTokenClient)

## 스키마 변경 (`usages`)
- 기존: `qr_payload` NOT NULL, UNIQUE(user_id, qr_payload)
- 변경:
  - `qr_payload` → nullable (Vision 인증에는 QR 없음)
  - UNIQUE(user_id, qr_payload) 제거 (Vision은 멱등성 키 없음)
  - 추가: `kind` (`USE`/`RETURN` enum), `game_id` (FK → games), `confidence` (DOUBLE)
  - 인덱스 추가: (user_id, kind)

## 구현 단계

### Phase A — 스키마 + 엔드포인트
- [ ] Prisma schema: Usage 모델에 `kind` enum + 필드 추가
- [ ] `prisma migrate dev --name extend_usages_for_vision`
- [ ] `verify.service.ts` 리팩토링: `verifyAndRecord(userId, kind, image, meta)` 단일 함수
- [ ] `verify.controller.ts`: `POST /verify/use`, `POST /verify/return`로 분리, `/verify/reusable` 제거
- [ ] DTO: `VerifyUseDto`, `VerifyReturnDto` (gameId/lat/lng — class-validator)

### Phase B — 반납 가드
- [ ] RETURN 호출 시 같은 user_id의 최근 USE를 `findFirst({orderBy: scannedAt desc})` 조회
- [ ] 없거나 12시간 이상 지났으면 409 + `{code:'NO_RECENT_USE'}`

### Phase C — 단위 테스트 (Jest)
- [ ] `verify.service.spec.ts`: PrismaService + axios mock
  - confidence < 70 → BadRequestException
  - vision이 single_use 반환 → BadRequestException
  - 정상 USE → Usage row + score=50 반환
  - RETURN without prior USE → ConflictException
  - RETURN with stale USE (>12h) → ConflictException
  - 정상 RETURN → Usage row + score=100

### Phase D — 문서
- [ ] `api-spec.md`: `/verify/use`, `/verify/return` 새 섹션 (이전 `/verify/reusable` 삭제 표기)
- [ ] `DATA_MODEL.md`: Usage 스키마 갱신
- [ ] `CHANGELOG.md`: 항목 추가

### Phase E — 프론트엔드 wire-up
- [ ] `AppContext.addCertification(type)`을 API 호출로 교체 (`apiClient.post('/verify/use'|return)`)
- [ ] 카메라 캡처 or 파일 픽커 — 우선 `<input type="file" accept="image/*" capture="environment">` 단순 폼
- [ ] 로딩/에러/성공 상태 UI
- [ ] 응답의 score를 AppContext.points에 반영 (백엔드 단일 소스 — 일단은 클라 로컬 합산 유지)

### Phase F — 배포 + e2e
- [ ] `verify.sh` 통과
- [ ] commit, push, PR, merge
- [ ] CI auto-deploy → 컨테이너 시작 시 migrate deploy
- [ ] curl로 e2e: 가짜 JWT는 어렵지만 401/400/422 경로는 검증 가능

## 범위 외 (다음 plan)
- Vision Cloud Run IAM 잠금 + GoogleAuth IdTokenClient (별도 plan)
- 점수 별도 `users.points` 캐시 컬럼 + 실시간 랭킹 (Redis ZSET)
- 위치 가드 (구장 반경 N미터)
- 다회 USE/RETURN 쌍 매칭 (1회 사용 = 1회 반납 강제)
