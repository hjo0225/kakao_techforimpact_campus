interface StatusBarProps {
  dark?: boolean;
  centerLabel?: string;
}

/** Dynamic Island 아래 여백만 확보하는 순수 스페이서. 시각 요소 없음. */
export function StatusBar(_props: StatusBarProps) {
  return <div className="cb-status-spacer" />;
}
