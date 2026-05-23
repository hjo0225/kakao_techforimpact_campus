# docs: QR 잔존 레퍼런스 정리 (Vision API 피벗 반영)

## Context

`feat-vision-api`/`feat-vision-usages`에서 인증 방식을 QR → Vision AI 사진 분류로 피벗 완료. 코드는 이미 깨끗(html5-qrcode/expo-barcode-scanner 제거, QrScanner 컴포넌트 없음). PRD/README는 적절히 갱신됨.

남아있는 stale 명세:

1. **CLAUDE.md** — Tech Stack에 `QR 스캔: html5-qrcode (브라우저) / RN 브릿지 (앱)` + `QR 스캔: expo-barcode-scanner (브릿지 경유)` 두 라인. Vision API 도메인 언급 없음. 다음 세션의 컨텍스트 첫 로드 지점이라 가장 stale 영향이 큼.
2. **docs/api-spec.md** — "추후 작성 영역" 섹션의 `POST /qr/scan — 다회용기 사용 인증 (QR payload + lat/lng)` 항목이 더 이상 계획 아님.
3. **docs/DATA_MODEL.md** — `usages.qr_payload` 컬럼 설명이 "향후 QR 스캔 방식 도입 시 사용" 미래형으로 표현돼 있음. 실제로는 Vision 피벗으로 legacy schema 호환만 위해 nullable로 남겨둔 컬럼. `stadiums (TBD)` 항목도 "QR payload에서 구장 식별" 근거로 적혀있음.

## 변경

### 1. `CLAUDE.md` (skip-worktree, 로컬 전용 갱신)
- Frontend Tech Stack `QR 스캔: html5-qrcode...` → 제거
- Mobile Tech Stack `QR 스캔: expo-barcode-scanner...` → 제거
- 새 항목 추가:
  - Frontend: `이미지 인증: 카메라 캡처 → 백엔드 multipart 업로드 → Vision API 분류`
  - Backend: `Vision: 별도 Cloud Run (cleanballtrio-vision, FastAPI + MobileNetV2)`
  - Mobile: `카메라: expo-camera (이미지 캡처 후 WebView로 전달)`

### 2. `docs/api-spec.md`
- "추후 작성 영역"에서 `POST /qr/scan` 한 줄 삭제
- 그 자리에 (필요하면) Vision 후속 후보를 명시할지는 보류 — 단순 제거

### 3. `docs/DATA_MODEL.md`
- `usages.qr_payload` 주석을 미래형 → 현재형으로 수정:
  - 기존: "Vision 인증에는 없음 (nullable)" + "향후 QR 스캔 방식 도입 시 사용. 현재는 Vision 인증만 있어 항상 null"
  - 신규: "Vision 인증으로 피벗 후 미사용. 초기 schema 호환을 위해 nullable로 보존. 신규 인증 흐름에서는 항상 null."
- `stadiums (TBD)` 섹션 — "QR payload에서 구장 식별 필요 시 추가" 근거 제거하고, "현재 구장 식별은 `usages.stadium_code` TEXT로 충분. 별도 마스터 필요 시 추가" 정도로 갱신
- Open Questions의 QR 관련 흔적 없는지 확인 (검색 결과 없음)

## 범위 외 (별도 plan 필요 시)

- `usages.qr_payload` 컬럼 자체 drop — 마이그레이션 부담 + 데이터 보존 정책 결정 필요 → 별도 plan
- 마이그레이션 파일(`backend/prisma/migrations/*`) 내 QR 언급 — 과거 기록이라 그대로 보존

## 검증

- `grep -ri 'QR\|qr-scan\|qr_payload\|qrPayload' docs/ CLAUDE.md README.md` — 의도된 잔존(historical/legacy)만 남는지 확인
- typecheck/build 불필요 (docs only)

## 커밋 단위

- `chore(docs): CLAUDE.md tech stack — QR → Vision API` (skip-worktree라 실제 git에는 안 올라감)
- `docs: remove planned POST /qr/scan + clarify qr_payload legacy intent`
