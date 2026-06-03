interface StatusBarProps {
  dark?: boolean;
  centerLabel?: string;
  /** 안전영역 스페이서 배경색 (예: 카메라 화면에서 헤더와 동일한 흰색으로 채울 때) */
  bg?: string;
}

/** Dynamic Island 아래 안전영역 여백을 확보하는 스페이서. bg로 배경을 채울 수 있음. */
export function StatusBar({ bg }: StatusBarProps) {
  return <div style={{ flexShrink: 0, height: 'max(44px, env(safe-area-inset-top, 44px))', background: bg }} />;
}
