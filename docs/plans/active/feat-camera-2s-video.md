# Plan: 2초 비디오 모드 (Phase 3, 셋로그 스타일) — 등록만

## 목표
하단 제어부 "비디오" 탭 선택 시 **정확히 2초** 짧은 영상 촬영 (셋로그처럼). 프레임/이모지 오버레이 포함.

## 범위
- 촬영/비디오 탭 전환
- 비디오: `MediaRecorder` + `canvas.captureStream()`로 프레임/이모지 오버레이를 그려 녹화
  - 카메라 `<video>` → 매 프레임 canvas에 그리기(+프레임+이모지) → canvas stream을 MediaRecorder로 녹화
- **2초 고정**: 녹화 시작 후 2000ms에 자동 정지
- 결과: 짧은 mp4/webm → 저장/다운로드(+ 서버 저장 정책 결정 필요: 이미지 저장과 동일 흐름으로 확장)

## 난이도/리스크
- 높음: 실시간 canvas 합성 루프 + MediaRecorder + 코덱(webm vs mp4) 호환
- WebView(안드로이드)에서 MediaRecorder/코덱 검증 필요
- 서버 저장 스키마(비디오) 확장 필요 가능성

## 의존
- Phase 1(라이브 카메라), Phase 2(이모지 합성) 위에 얹는 것이 자연스러움

## 상태
미착수 — Phase 1/2 이후 진행
