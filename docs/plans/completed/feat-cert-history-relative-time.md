# feat: 인증 히스토리 시간 표시를 상대 시속으로

## 배경
인증 히스토리(certificationLogs)가 `HH:MM`만 표시해 날짜가 안 보임. 일주일 전 인증과 오늘 인증이 같은 "14:23"으로 나오는 문제.

## 변경 (`frontend/src/app/AppContext.tsx`)

`mapUsageLog`의 `time` 필드를 상대 시속으로:

| 경과 | 표시 |
|---|---|
| < 1분 | "방금 전" |
| < 1시간 | "N분 전" |
| 오늘 | "N시간 전" |
| 어제 | "어제 HH:MM" |
| < 7일 | "N일 전" |
| 그 이상 | "MM.DD" (같은 연도) / "YYYY.MM.DD" (지난 연도) |

### 구현

```ts
function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `${Math.floor(diffMin / 60)}시간 전`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `어제 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays}일 전`;

  const sameYear = date.getFullYear() === now.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return sameYear ? `${m}.${d}` : `${date.getFullYear()}.${m}.${d}`;
}
```

`mapUsageLog`에서 `time: formatRelativeTime(log.scannedAt)`로 교체.

### 알려진 제약 (범위 외)
화면이 열려있는 동안 시간이 흘러도 "방금 전"이 그대로 — 다시 fetch될 때까지 멈춤. 자동 갱신이 필요해지면 별 plan에서 useEffect + setInterval 추가.

## 검증
- `npm run build`
- 화면에서 인증 행이 "방금 전" / "N시간 전" / "어제 14:23" 등으로 변경됨 확인
