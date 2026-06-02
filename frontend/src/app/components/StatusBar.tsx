interface StatusBarProps {
  dark?: boolean;
  centerLabel?: string;
}

/** 상단 헤더 — Dynamic Island 아래 안전영역 + 화면 제목(가독성 위해 또렷하게). */
export function StatusBar({ centerLabel }: StatusBarProps) {
  return (
    <header
      style={{
        flexShrink: 0,
        paddingTop: 'max(44px, env(safe-area-inset-top, 44px))',
        paddingBottom: 10,
        background: '#fff',
        borderBottom: '2px solid #430A21',
        boxShadow: '0 2px 0 0 rgba(67, 10, 33, 0.08)',
      }}
    >
      {centerLabel && (
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 800,
            color: '#430A21',
            letterSpacing: '-0.01em',
          }}
        >
          {centerLabel}
        </p>
      )}
    </header>
  );
}
