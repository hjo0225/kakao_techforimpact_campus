import { getAvatarParts, type AvatarConfig } from '../avatar';

type AvatarFigureProps = {
  config: AvatarConfig;
  size?: number;
  showBackdrop?: boolean;
};

const POSE_ARM_STYLES = {
  cheer: {
    left: 'rotate(-44deg) translateY(-12%)',
    right: 'rotate(44deg) translateY(-12%)',
    top: 0.55,
  },
  pickup: {
    left: 'rotate(-8deg)',
    right: 'rotate(34deg) translateY(18%)',
    top: 0.66,
  },
  share: {
    left: 'rotate(-20deg) translateY(4%)',
    right: 'rotate(22deg) translateY(2%)',
    top: 0.64,
  },
};

export function AvatarFigure({ config, size = 92, showBackdrop = false }: AvatarFigureProps) {
  const { cap, jersey, pose, backdrop } = getAvatarParts(config);
  const headSize = size * 0.58;
  const bodyWidth = size * 0.56;
  const bodyHeight = size * 0.48;
  const figureHeight = size * 1.22;
  const armStyle = POSE_ARM_STYLES[pose.key];
  const skin = '#FFE1C8';
  const eye = '#1F2937';

  const figure = (
    <div
      style={{
        width: size,
        height: figureHeight,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {pose.key === 'cheer' && (
        <>
          <span
            style={{
              position: 'absolute',
              top: size * 0.06,
              left: size * 0.11,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#FBBF24',
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: size * 0.14,
              right: size * 0.1,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#3DDB6D',
            }}
          />
        </>
      )}

      <span
        style={{
          position: 'absolute',
          top: size * armStyle.top,
          left: size * 0.19,
          width: size * 0.13,
          height: size * 0.42,
          borderRadius: 999,
          background: skin,
          transform: armStyle.left,
          transformOrigin: '50% 0%',
          boxShadow: 'inset 0 -7px 0 rgba(0,0,0,0.05)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: size * armStyle.top,
          right: size * 0.19,
          width: size * 0.13,
          height: size * 0.42,
          borderRadius: 999,
          background: skin,
          transform: armStyle.right,
          transformOrigin: '50% 0%',
          boxShadow: 'inset 0 -7px 0 rgba(0,0,0,0.05)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: size * 0.14,
          left: '50%',
          width: headSize,
          height: headSize,
          borderRadius: '50%',
          background: skin,
          transform: 'translateX(-50%)',
          boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.04)',
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: headSize * 0.02,
            left: headSize * 0.08,
            right: headSize * 0.08,
            height: headSize * 0.24,
            borderRadius: '16px 16px 10px 10px',
            background: cap.color,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: headSize * 0.21,
            left: headSize * 0.2,
            right: headSize * 0.2,
            height: headSize * 0.09,
            borderRadius: 999,
            background: `${cap.color}CC`,
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: headSize * 0.45,
            left: headSize * 0.31,
            width: headSize * 0.07,
            height: headSize * 0.07,
            borderRadius: '50%',
            background: eye,
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: headSize * 0.45,
            right: headSize * 0.31,
            width: headSize * 0.07,
            height: headSize * 0.07,
            borderRadius: '50%',
            background: eye,
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: headSize * 0.6,
            left: '50%',
            width: headSize * 0.2,
            height: headSize * 0.08,
            borderBottom: `2px solid ${eye}`,
            borderRadius: '0 0 999px 999px',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: size * 0.69,
          left: '50%',
          width: bodyWidth,
          height: bodyHeight,
          borderRadius: '18px 18px 12px 12px',
          background: `linear-gradient(180deg, ${jersey.primary} 0%, ${jersey.primary} 56%, ${jersey.secondary} 56%, ${jersey.secondary} 100%)`,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 10px 16px rgba(15,23,42,0.08)',
          transform: 'translateX(-50%)',
          zIndex: 3,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 9,
            left: '50%',
            width: bodyWidth * 0.24,
            height: 2,
            borderRadius: 999,
            background: jersey.secondary,
            opacity: 0.9,
            transform: 'translateX(-50%)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            fontSize: Math.max(10, size * 0.11),
            fontWeight: 900,
            color: '#fff',
            transform: 'translateX(-50%)',
            textShadow: '0 1px 4px rgba(0,0,0,0.16)',
          }}
        >
          9
        </span>
      </div>

      <span
        style={{
          position: 'absolute',
          bottom: 0,
          left: size * 0.36,
          width: size * 0.09,
          height: size * 0.24,
          borderRadius: 999,
          background: '#173B63',
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          right: size * 0.36,
          width: size * 0.09,
          height: size * 0.24,
          borderRadius: 999,
          background: '#173B63',
        }}
      />

      {pose.key !== 'cheer' && (
        <span
          style={{
            position: 'absolute',
            right: size * 0.04,
            bottom: size * 0.24,
            width: size * 0.27,
            height: size * 0.27,
            borderRadius: pose.key === 'share' ? 8 : '50%',
            background: pose.key === 'share' ? '#111827' : '#E8F8EE',
            border: pose.key === 'share' ? '2px solid #374151' : '1px solid #C8F2D6',
            color: pose.key === 'share' ? '#fff' : '#13923F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.max(12, size * 0.13),
            boxShadow: '0 8px 16px rgba(15,23,42,0.12)',
            zIndex: 4,
          }}
        >
          {pose.emoji}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        width: showBackdrop ? size * 1.34 : size,
        minHeight: showBackdrop ? figureHeight + 24 : figureHeight,
        borderRadius: showBackdrop ? 28 : 0,
        background: showBackdrop ? backdrop.background : 'transparent',
        border: showBackdrop ? '1px solid rgba(255,255,255,0.18)' : 'none',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: showBackdrop ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
      }}
    >
      {showBackdrop && (
        <>
          <span
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: 18,
              height: 2,
              borderRadius: 999,
              background: `${backdrop.accent}55`,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 12,
              width: size * 0.7,
              height: size * 0.14,
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.12)',
              transform: 'translateX(-50%)',
            }}
          />
        </>
      )}
      {figure}
    </div>
  );
}
