# Plan: 1컷 프레임 + 버튼 프레스 인터랙션 + WebView 호환성 + 튜토리얼 스크린샷

## 목표 (사용자 확정)
1. **1컷 프레임**: 감정 캐릭터 7종(기본/설렘/승리/패배/좌절/불만/조롱, 투명 PNG)으로 1컷 야구네컷 추가.
   풀블리드 사진 1장 + 캐릭터 스티커 오버레이. 사용자가 캐릭터 **위치(드래그)/크기(슬라이더)** 편집.
2. **버튼 프레스 인터랙션**: 앱의 픽셀/하드섀도 무드에 맞는 :active 프레스(translateY + 섀도 collapse).
3. **WebView 호환성**: react-native-webview 래핑 시 깨질 부분 사전 수정 (다운로드, getUserMedia, 세션 등).
   로그인 세션 관련 수정 포함 (401 처리 등).
4. **튜토리얼 완성**: 로컬 서버 가동 상태에서 실제 화면 4장 캡처 → `assets/tutorial/` 교체.

## 스코프

### 1. 1컷 프레임 (`VisitCard.tsx` + 에셋)
- 에셋: `frontend/src/assets/card-frames/1cut-{default,excited,victory,defeat,frustrated,grumpy,mock}.png`
  (Downloads의 `*_1컷프레임.png` 복사, 필요 시 여백 트리밍)
- `CardFrame`에 `sticker?: { src, width, height }` 추가. 1컷 프레임은 `src` 오버레이 없음(스티커만).
- 1컷 슬롯: 1080×1920 풀블리드 1슬롯 → 기존 `FRAME_CUTS` 자동노출로 "1컷" 탭 생성됨.
- 스티커 상태: `{ scale, offsetX, offsetY }` — 드래그 이동 + 크기 슬라이더(기존 zoom control 패턴 재사용).
- `createCardImage`: 사진 cover → 스티커를 transform 적용해 drawImage.
- 프레임 선택 썸네일: 1컷은 스티커 이미지로 표시.

### 2. 버튼 프레스 인터랙션 (`DESIGN.md` → `design-system.css`)
- chore(design) 커밋: DESIGN.md에 press interaction 토큰/규칙 추가.
- `.cb-press` 유틸리티(또는 전역 button:active 규칙): translateY(2~3px) + 하드섀도 축소, `prefers-reduced-motion` 존중.
- VisitCard/주요 화면 버튼 적용.

### 3. WebView 호환성 + 세션
- 점검 항목: blob `a.click()` 다운로드(WebView 미지원 → postMessage 브릿지 폴백),
  getUserMedia(권한/미지원 시 파일선택 폴백 — 기존 camError 경로 확인),
  zustand persist(localStorage) 유지, 카카오 로그인 브릿지, JWT 만료 시 401 → 로그아웃/재로그인 유도.
- 발견된 문제만 수정. API 변경 없음 예상.

### 4. 튜토리얼 스크린샷
- puppeteer로 로컬(5173, BE 3002 가동) 4화면 캡처: 지도/인증/직관카드/기록(캘린더).
- `assets/tutorial/{map,verify,card,record}.png` 교체, TutorialOverlay 슬라이드에 반영.

## 후속 확장 (사용자 피드백, 2026-06-11)

- **1컷 멀티 스티커**: 감정 캐릭터 선택은 교체가 아니라 **추가** — 여러 캐릭터를 얹을 수 있는
  스티커 배열로 재구성. 스티커별 드래그/크기/반전/회전/삭제.
- **저장 버튼**: 슬롯/스티커 편집 패널에서는 숨김 — 기본 컨트롤에서만 노출 (편집 닫기=취소 오해 방지).
- **튜토리얼 레이아웃**: 캡쳐본을 상단부터 크게, 마스코트 축소, 설명을 마스코트 말풍선으로.
- 1컷 라이브 프리뷰 풀블리드 (완료).

## 검증
- 단위: 1컷 스티커 transform 유틸, 세션 만료 핸들러.
- 수동: 1컷 카드 합성/저장, 프레스 인터랙션, 튜토리얼 4슬라이드.
- `./scripts/verify.sh` 통과.
