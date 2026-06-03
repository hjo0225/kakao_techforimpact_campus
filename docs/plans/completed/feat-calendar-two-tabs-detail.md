# Plan: 캘린더 2탭(다회용기 인증 / 직관카드) + 월간 그리드 + 날짜 상세

## 목표
독서/구매 캘린더 UI 구조를 그대로 차용해, 현재의 단순 사진 갤러리를 **2탭 월간 캘린더**로 재구성한다.

- 좌측 탭: **다회용기 인증** (구 독서캘린더) — 날짜별 인증 사진 썸네일
- 우측 탭: **직관카드** (구 구매캘린더) — 날짜별 수집 카드 썸네일

## 차용할 UI 구조
- 상단 탭 토글: 다회용기 인증 / 직관카드
- 상단 컨트롤: 좌측 `연.월` 드롭다운(+ ◀ ▶), 우측 공유 아이콘 + 보기 전환(리스트/그리드)
- 요일 헤더: 일~토, 일요일 빨간색
- 월간 그리드: 날짜 칸에 그날의 대표 썸네일. 기록 없는 날은 빈 칸
- 월 네비게이션 유지

## 추가 요구사항
- 하루에 여러 장 촬영 가능 → **날짜 칸 탭 시 상세 페이지**(그 날의 모든 사진 그리드)로 진입
- 상세에서 사진 탭 → 풀스크린 라이트박스

## 스코프 (CalendarScreen.tsx 단일 파일 재작성)
- 두 데이터 소스 정규화
  - 다회용기 인증: `getVerificationHistory()` + `fetchVerificationImageUrl(id)` (auth blob)
  - 직관카드: `getVisitCards()` + `sharedCardImageUrl(token)` (public URL)
- 공통 `CalEntry { id, createdAt, imageMode: 'auth'|'public', src }` 모델
- 보기 전환: 그리드(월간 캘린더) / 리스트(날짜별 그룹)
- 상세 페이지 = 화면 내 state 기반 뷰(라우터 파라미터 미지원이라 in-screen)
- 공유: `navigator.share` → 클립보드 폴백 (월 요약 텍스트)

## 디자인
- DESIGN.md vintage 팔레트(cream/burgundy/rose)로 정렬. 기존 dark slate 인라인 제거
- 픽셀 룩: 2px solid #430A21 border, hard shadow, radius 0

## 완료 기준
- 두 탭 토글 동작, 각 탭이 올바른 데이터 소스 사용
- 월간 그리드에 날짜별 썸네일 노출, 빈 날은 빈 칸
- 월 이동(◀ ▶ / 드롭다운) 동작
- 날짜 탭 → 상세에서 그날 모든 사진 확인, 라이트박스 동작
- 리스트/그리드 전환, 공유 버튼 동작
- typecheck + build 통과
