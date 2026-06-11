# Fix: 지도 필터 칩 규격 통일 + 셔터 플래시 + deploy.yml 키 없는 배포 차단

## 배경
1. 지도 탭 용기 필터(용기 전체/다회용기 가능/개인용기 가능)가 위 카테고리 칩과 크기가 달라 어색함
2. 촬영 버튼의 검은 테두리 제거 요청 + 촬영 시 "찰칵" 플래시 인터랙션 부재
3. **배포본 카카오맵 키 재누락**: `deploy.yml`의 `ci-frontend` 잡이 `VITE_KAKAO_MAPS_JS_KEY` 없이 빌드 후
   가드 없이 Firebase Hosting에 배포 → `deploy-frontend.yml`(정상)과 main 푸시마다 배포 경쟁,
   늦게 끝나는 쪽이 라이브를 덮어씀. 이번엔 키 없는 쪽이 이겨서 지도 깨짐
4. 지도 위 3개 div(검색/카테고리/용기필터) 수직 간격 불균형 (16px/8px/8px)

## 변경
### frontend/src/app/components/screens/MapScreen.tsx
- 용기 필터 버튼: 카테고리 칩과 동일 폭 `calc((100% - 20px) / 5)` (5등분 규격), 좌측 정렬 유지
- 글자 넘침 방지: `fontSize: clamp()` 축소
- 3개 div 간격 균형: 검색바 bottom 4 / 카테고리 4-4 / 필터 4-8, 수평 패딩 12 통일

### frontend/src/app/components/screens/VisitCard.tsx
- 촬영 버튼 `border` 제거
- `capture()`에 플래시 상태 추가, 전체 화면 `.cb-shutter-flash` 오버레이 (280ms fade-out)

### frontend/src/styles/design-system.css
- `.cb-shutter-flash` + `@keyframes cb-shutter-flash` 추가 (reduced-motion 대응)

### .github/workflows/deploy.yml
- `ci-frontend` 잡에서 Firebase Hosting 배포 단계 제거 → CI 전용 (typecheck+build)
- 배포는 가드 있는 `deploy-frontend.yml` 단일 경로로 일원화

## 검증
- frontend typecheck + build
- 라이브 번들에 `dapi.kakao.com` 임베드 확인 (배포 후 curl grep)
