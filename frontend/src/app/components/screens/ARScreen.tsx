import { X, Map } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigation } from '../../navigation';

export function ARScreen() {
  const { navigate } = useNavigation();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: '#1C2B1E' }}>
      {/* Simulated Camera Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #1A2B1C 0%, #2C3E2E 40%, #1E2F20 100%)',
        overflow: 'hidden',
      }}>
        {/* Simulated stadium environment */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(0deg, rgba(20,40,22,0.9) 0%, transparent 100%)',
        }} />
        {/* Ground lines */}
        {[20, 35, 50, 65].map((pct, i) => (
          <div key={i} style={{
            position: 'absolute',
            bottom: `${pct}%`,
            left: 0, right: 0,
            height: 1,
            background: 'rgba(255,255,255,0.04)',
            transform: 'perspective(200px) rotateX(60deg)',
          }} />
        ))}
      </div>

      {/* Top Controls */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate('map')}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '8px 14px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
          }}
        >
          <X size={14} />
          종료
        </button>
        <button
          onClick={() => navigate('map')}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '8px 14px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
          }}
        >
          <Map size={14} />
          2D 지도
        </button>
      </div>

      {/* AR Arrow Navigation */}
      <div style={{
        position: 'absolute',
        top: '15%', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Distance ring */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 70, height: 70,
            borderRadius: '50%',
            border: '2px solid rgba(61,219,109,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 8,
            background: 'rgba(61,219,109,0.15)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1 }}>12m</p>
        </motion.div>

        {/* Directional Arrow */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="48" height="72" viewBox="0 0 48 72" fill="none">
            <defs>
              <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(61,219,109,0.95)" />
                <stop offset="100%" stopColor="rgba(26,184,82,0.7)" />
              </linearGradient>
            </defs>
            <polygon points="24,4 44,28 34,26 34,68 14,68 14,26 4,28" fill="url(#arrowGrad)" />
            <polygon points="24,4 44,28 34,26 34,68 14,68 14,26 4,28"
              fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          </svg>
        </motion.div>
      </div>

      {/* AR Path Lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3 }}
        viewBox="0 0 320 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pathGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(61,219,109,0.6)" />
            <stop offset="100%" stopColor="rgba(61,219,109,0)" />
          </linearGradient>
        </defs>
        <polygon points="160,600 100,400 220,400" fill="url(#pathGrad)" />
        <line x1="160" y1="600" x2="160" y2="200" stroke="rgba(61,219,109,0.5)" strokeWidth="2" strokeDasharray="12,8" />
      </svg>

      {/* Info Card */}
      <div style={{
        position: 'absolute', bottom: 80, left: 16, right: 16, zIndex: 10,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 20,
        padding: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 11, color: '#3DDB6D', fontWeight: 600, marginBottom: 2 }}>목적지</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
              3루 통로 쓰레기통
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>상태: 여유 · 12m 앞</p>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#E2FAE9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22 }}>🗑️</span>
          </div>
        </div>
      </div>

      {/* QR Hint */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 10,
        background: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: '10px 14px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          QR 마커를 찾아 스캔하면 정확한 위치를 확인할 수 있어요
        </p>
      </div>
    </div>
  );
}
