# feat: Vision AI 백엔드 통합 (다회용기 판별)

## 목표
사용자가 학습한 MobileNetV2 모델(`best_model.pth`)을 별도 Cloud Run 서비스로 띄우고,
NestJS 백엔드가 이를 프록시로 호출하는 형태로 다회용기/일회용기 판별을 제공한다.
사용 인증(in-use)과 반납 인증(return) 둘 다 동일한 분류기를 사용한다.

## 결정 사항
- **분리 배포**: TypeScript 이식 대신 Python 그대로 별도 Cloud Run 서비스.
  - 모델 그대로 → 정확도 그대로
  - NestJS는 비즈니스 로직(JWT, 점수, usages 적재)에 집중
- **서비스명**: `cleanballtrio-vision` (asia-northeast3)
- **인증**: 1차는 `--allow-unauthenticated` + Vision 서비스 URL을 NestJS env로만 주입. 추후 Cloud Run IAM(`run.invoker`)으로 잠금 예정.
- **NestJS 엔드포인트**: `POST /verify/reusable` (JWT 필수) — multipart `image` 받아서 Vision으로 forward
- **반환 형식**: Vision 서비스 응답을 그대로 패스스루 + 호출 사용자 정보(`userId`) 동봉

## 아키텍처
```
브라우저 ──image(multipart)──▶ NestJS /verify/reusable (JWT)
                                  │
                                  │ axios POST multipart (image)
                                  ▼
                          Cloud Run [cleanballtrio-vision]
                          Python FastAPI · MobileNetV2
                                  │
                                  ▼
                              {isReusable, confidence}
                                  ↑
                            NestJS가 응답을 그대로 반환
```

## 구현 단계

### Phase A — Vision 서비스 (Python)
- [ ] `vision/` 디렉토리에 `app.py`, `model.py`, `best_model.pth`, `requirements.txt` 복사
- [ ] `vision/app.py`에 `GET /healthz` 추가 + 시작 시 모델 로드 실패면 throw (현재는 print만)
- [ ] `vision/Dockerfile` 작성 — `python:3.11-slim` + torch CPU + uvicorn 8080
- [ ] `vision/.dockerignore`
- [ ] `scripts/deploy-vision.ps1` — Cloud Build로 배포
- [ ] 첫 배포 → URL 확인

### Phase B — NestJS proxy
- [ ] `backend/src/verify/` 모듈: Controller / Service / DTO (`UploadFile`)
- [ ] `POST /verify/reusable` (multipart image, JWT 필수) → Vision으로 forward
- [ ] 환경변수 `VISION_API_URL` (Cloud Run env 추가)
- [ ] `verify` 모듈을 `app.module.ts`에 등록
- [ ] `multer` 의존성 추가 (NestJS의 `@nestjs/platform-express`로 `FileInterceptor` 사용)

### Phase C — 문서
- [ ] `api-spec.md`: `POST /verify/reusable` 엔드포인트 추가
- [ ] `ARCHITECTURE.md`: 다이어그램에 vision 서비스 추가
- [ ] `CHANGELOG.md`: 항목 추가

### Phase D — 배포
- [ ] vision 서비스 배포
- [ ] `backend/.env`에 `VISION_API_URL` 추가
- [ ] `scripts/deploy-backend.ps1`에 `VISION_API_URL` 주입
- [ ] NestJS 재배포 + e2e 테스트 (샘플 이미지로 cURL)

## 범위 외 (다음 plan)
- `usages` 테이블에 인증 기록 적재 + 점수 산정
- 반납 인증 흐름 차별화 (시간/위치 가드 등)
- Vision Cloud Run IAM 잠금
- 모델 재훈련 파이프라인 / Model Registry
- 프론트엔드 UI 와이어업
