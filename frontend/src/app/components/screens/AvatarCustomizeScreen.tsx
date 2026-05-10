import { Check, ChevronLeft, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../../AppContext';
import {
  AVATAR_PRESETS,
  BACKDROP_OPTIONS,
  CAP_OPTIONS,
  DEFAULT_AVATAR_CONFIG,
  JERSEY_OPTIONS,
  POSE_OPTIONS,
  getAvatarParts,
  isSameAvatarConfig,
  type AvatarConfig,
} from '../../avatar';
import { useNavigation } from '../../navigation';
import { AvatarFigure } from '../AvatarFigure';
import { StatusBar } from '../StatusBar';
import { TeamBadge } from '../TeamBadge';
import { useAuthStore } from '@/store/authStore';

type EditorTab = 'preset' | 'cap' | 'jersey' | 'pose' | 'backdrop';

const EDITOR_TABS: { key: EditorTab; label: string }[] = [
  { key: 'preset', label: '추천' },
  { key: 'cap', label: '캡' },
  { key: 'jersey', label: '유니폼' },
  { key: 'pose', label: '포즈' },
  { key: 'backdrop', label: '배경' },
];

function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function OptionButton({
  active,
  title,
  caption,
  visual,
  onClick,
}: {
  active: boolean;
  title: string;
  caption?: string;
  visual: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 88,
        borderRadius: 16,
        border: active ? '1.5px solid #13923F' : '1px solid #E5E7EB',
        background: active ? '#F0FFF6' : '#fff',
        cursor: 'pointer',
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        position: 'relative',
        boxShadow: active ? '0 8px 18px rgba(19,146,63,0.1)' : 'none',
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#13923F',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} />
        </span>
      )}
      {visual}
      <span style={{ fontSize: 11, color: active ? '#13923F' : '#111827', fontWeight: 900 }}>
        {title}
      </span>
      {caption && (
        <span style={{ fontSize: 9, color: '#8C97A4', lineHeight: 1.25 }}>
          {caption}
        </span>
      )}
    </button>
  );
}

export function AvatarCustomizeScreen() {
  const { navigate } = useNavigation();
  const { selectedTeam, avatarConfig, setAvatarConfig } = useApp();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<EditorTab>('preset');
  const avatarParts = getAvatarParts(avatarConfig);

  const selectedPreset = useMemo(
    () => AVATAR_PRESETS.find((preset) => isSameAvatarConfig(preset.config, avatarConfig)),
    [avatarConfig],
  );

  const updateAvatar = (patch: Partial<AvatarConfig>) => {
    setAvatarConfig({ ...avatarConfig, ...patch });
  };

  const randomizeAvatar = () => {
    setAvatarConfig({
      cap: pickRandom(CAP_OPTIONS).key,
      jersey: pickRandom(JERSEY_OPTIONS).key,
      pose: pickRandom(POSE_OPTIONS).key,
      backdrop: pickRandom(BACKDROP_OPTIONS).key,
    });
  };

  const editorContent = (() => {
    if (activeTab === 'preset') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AVATAR_PRESETS.map((preset) => {
            const active = isSameAvatarConfig(preset.config, avatarConfig);
            const parts = getAvatarParts(preset.config);

            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setAvatarConfig(preset.config)}
                style={{
                  width: '100%',
                  minHeight: 86,
                  borderRadius: 18,
                  border: active ? '1.5px solid #13923F' : '1px solid #E5E7EB',
                  background: active ? '#F0FFF6' : '#fff',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: active ? '0 8px 18px rgba(19,146,63,0.1)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 68,
                    borderRadius: 16,
                    background: parts.backdrop.background,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <AvatarFigure config={preset.config} size={50} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 4 }}>{preset.label}</p>
                  <p style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.45, marginBottom: 5 }}>{preset.caption}</p>
                  <p style={{ fontSize: 9, color: '#8C97A4', lineHeight: 1.35 }}>
                    {parts.cap.label} · {parts.jersey.label} · {parts.pose.label}
                  </p>
                </div>
                {active && (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: '#13923F',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'cap') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {CAP_OPTIONS.map((option) => (
            <OptionButton
              key={option.key}
              active={avatarConfig.cap === option.key}
              title={option.label}
              caption={option.caption}
              visual={<span style={{ width: 28, height: 28, borderRadius: 999, background: option.color }} />}
              onClick={() => updateAvatar({ cap: option.key })}
            />
          ))}
        </div>
      );
    }

    if (activeTab === 'jersey') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {JERSEY_OPTIONS.map((option) => (
            <OptionButton
              key={option.key}
              active={avatarConfig.jersey === option.key}
              title={option.label}
              caption={option.caption}
              visual={(
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: `linear-gradient(180deg, ${option.primary} 0%, ${option.primary} 55%, ${option.secondary} 55%, ${option.secondary} 100%)`,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
              )}
              onClick={() => updateAvatar({ jersey: option.key })}
            />
          ))}
        </div>
      );
    }

    if (activeTab === 'pose') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {POSE_OPTIONS.map((option) => (
            <OptionButton
              key={option.key}
              active={avatarConfig.pose === option.key}
              title={option.label}
              caption={option.caption}
              visual={<span style={{ fontSize: 26, lineHeight: 1 }}>{option.emoji}</span>}
              onClick={() => updateAvatar({ pose: option.key })}
            />
          ))}
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {BACKDROP_OPTIONS.map((option) => (
          <OptionButton
            key={option.key}
            active={avatarConfig.backdrop === option.key}
            title={option.label}
            caption={option.caption}
            visual={(
              <span
                style={{
                  width: 34,
                  height: 28,
                  borderRadius: 10,
                  background: option.background,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: `inset 0 -4px 0 ${option.accent}55`,
                }}
              />
            )}
            onClick={() => updateAvatar({ backdrop: option.key })}
          />
        ))}
      </div>
    );
  })();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2FBF5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <StatusBar />
        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 14px 10px', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate('account')}
            aria-label="MY로 돌아가기"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={22} color="#374151" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#111827', flex: 1 }}>아바타 꾸미기</span>
        </div>
      </div>

      <div
        className="hide-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <section
          style={{
            borderRadius: 24,
            padding: '16px',
            background: 'linear-gradient(145deg, #102A4B 0%, #17416D 64%, #1E6B79 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(16,42,75,0.16)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <AvatarFigure config={avatarConfig} size={104} showBackdrop />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <TeamBadge teamName={selectedTeam} size={34} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>
                  {selectedTeam || '응원팀'}
                </span>
              </div>
              <p style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.25, marginBottom: 6 }}>
                {user?.nickname ?? '게스트'} 선수
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.76)', lineHeight: 1.5 }}>
                {selectedPreset?.label ?? '직접 커스텀'} · {avatarParts.backdrop.label}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <button
              type="button"
              onClick={randomizeAvatar}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: 14,
                padding: '10px 14px',
                minHeight: 44,
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={14} />
              랜덤 조합
            </button>
            <button
              type="button"
              onClick={() => setAvatarConfig(DEFAULT_AVATAR_CONFIG)}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: 14,
                padding: '10px 14px',
                minHeight: 44,
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={14} />
              초기화
            </button>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: 14,
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Palette size={15} color="#13923F" />
            <p style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>커스텀 보드</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 6,
              padding: 4,
              borderRadius: 16,
              background: '#F4F7F5',
              marginBottom: 12,
            }}
          >
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  minHeight: 44,
                  border: 'none',
                  borderRadius: 12,
                  background: activeTab === tab.key ? '#fff' : 'transparent',
                  color: activeTab === tab.key ? '#13923F' : '#6B7280',
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.key ? '0 4px 12px rgba(15,23,42,0.08)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {editorContent}
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: 14,
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 10 }}>MY 표시 정보</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 7 }}>
            {[
              avatarParts.cap.label,
              avatarParts.jersey.label,
              avatarParts.pose.label,
              avatarParts.backdrop.label,
            ].map((label) => (
              <div
                key={label}
                style={{
                  borderRadius: 13,
                  background: '#F7FAF8',
                  border: '1px solid #E5F2E9',
                  padding: '9px 5px',
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#374151',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ padding: '12px 20px 24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <button
          type="button"
          onClick={() => navigate('account')}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 16,
            padding: 15,
            background: 'linear-gradient(135deg, #3DDB6D, #1AB852)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(61,219,109,0.26)',
          }}
        >
          MY에 적용하기
        </button>
      </div>
    </div>
  );
}
