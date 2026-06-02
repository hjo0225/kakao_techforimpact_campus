interface StatusBarProps {
  dark?: boolean;
  centerLabel?: string;
}

/** Dynamic Island 아래 안전영역 여백만 확보하는 순수 스페이서. 시각 요소 없음. */
export function StatusBar(_props: StatusBarProps) {
  return <div style={{ flexShrink: 0, height: 'max(44px, env(safe-area-inset-top, 44px))' }} />;
}
