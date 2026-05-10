import { useState } from 'react';
import { useApp } from '../../AppContext';
import { Bell, ChevronRight, MapPin } from 'lucide-react';
import { useNavigation } from '../../navigation';
import { KBO_TEAMS } from '../../teamBrand';
import { TeamBadge } from '../TeamBadge';
import { cx } from '../../classNames';
import { ActionBar, Button, Screen, ScreenHeader, ScrollArea } from '../design-system';

const ONBOARDING_SLIDES = [
  {
    eyebrow: '문제',
    title: '경기 후 쓰레기가 한 번에 몰립니다',
    description: '9회 이후 반납과 수거 수요가 집중되면 운영팀도 팬도 오래 기다리게 됩니다.',
    metric: '9회 이후 집중',
  },
  {
    eyebrow: '솔루션',
    title: '지도와 인증으로 다회용기를 쉽게 씁니다',
    description: '다회용기 매장, 반납함, 협력 식당을 미리 확인하고 Vision AI로 사용과 반납을 인증합니다.',
    metric: 'AI 사진 인증',
  },
  {
    eyebrow: '보상',
    title: '내 포인트가 응원팀 순위로 이어집니다',
    description: '사용과 반납 행동은 개인 포인트와 팀 환경 리그 점수에 동시에 반영됩니다.',
    metric: 'KBO 환경 리그',
  },
];

export function TeamSelectScreen() {
  const { navigate } = useNavigation();
  const { setSelectedTeam } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<'slides' | 'team' | 'permissions'>('slides');
  const [slideIndex, setSlideIndex] = useState(0);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [notificationAllowed, setNotificationAllowed] = useState(true);

  const handleStart = () => {
    if (!selected) return;
    setSelectedTeam(selected);
    navigate('home');
  };

  const handleNextSlide = () => {
    if (slideIndex < ONBOARDING_SLIDES.length - 1) {
      setSlideIndex((current) => current + 1);
    } else {
      setStep('team');
    }
  };

  if (step === 'slides') {
    const slide = ONBOARDING_SLIDES[slideIndex];

    return (
      <Screen>
        <ScreenHeader
          eyebrow={`ONBOARDING ${slideIndex + 1} / ${ONBOARDING_SLIDES.length}`}
          title={slide.title}
          description={slide.description}
        />

        <ScrollArea>
          <div style={{
            minHeight: 380,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 18,
          }}>
            <div style={{
              borderRadius: 24,
              padding: '28px 24px',
              background: 'linear-gradient(135deg, #0F7038, #3DDB6D)',
              color: '#fff',
              boxShadow: '0 16px 32px rgba(19,146,63,0.22)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>
                {slide.eyebrow}
              </p>
              <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: 0, lineHeight: 1.18, marginBottom: 18 }}>
                {slide.metric}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 7,
              }}>
                {ONBOARDING_SLIDES.map((item, index) => (
                  <div
                    key={item.eyebrow}
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: index <= slideIndex ? '#fff' : 'rgba(255,255,255,0.24)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: '포인트', value: '50P' },
                { label: '타임세일', value: '2배' },
                { label: '공유 카드', value: '1장' },
                { label: '팀 리그', value: '10구단' },
              ].map((item) => (
                <div key={item.label} className="cb-card" style={{ padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <ActionBar>
          <Button onClick={handleNextSlide} size="lg" fullWidth>
            {slideIndex === ONBOARDING_SLIDES.length - 1 ? '응원팀 선택하기' : '다음'}
            <ChevronRight size={16} />
          </Button>
        </ActionBar>
      </Screen>
    );
  }

  if (step === 'permissions') {
    return (
      <Screen>
        <ScreenHeader
          eyebrow="STEP 2 / 2"
          title="권한을 설정해주세요"
          description={`${selected} 팬으로 환경 리그에 참여합니다`}
        />

        <ScrollArea stack>
          {[
            {
              icon: <MapPin size={18} />,
              title: '위치 권한',
              description: '좌석 기준 가장 가까운 반납함을 추천합니다',
              checked: locationAllowed,
              onClick: () => setLocationAllowed((current) => !current),
            },
            {
              icon: <Bell size={18} />,
              title: '알림 권한',
              description: '7~8회 조기반납 타임세일을 알려드립니다',
              checked: notificationAllowed,
              onClick: () => setNotificationAllowed((current) => !current),
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="cb-card"
              style={{
                width: '100%',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                borderColor: item.checked ? '#C0F5D3' : '#E5E7EB',
                background: item.checked ? '#F8FFFA' : '#fff',
              }}
            >
              <span style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                background: item.checked ? '#E2FAE9' : '#F3F4F6',
                color: item.checked ? '#13923F' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#111827' }}>{item.title}</span>
                <span style={{ display: 'block', fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.description}</span>
              </span>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: item.checked ? '#3DDB6D' : '#E5E7EB',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 900,
              }}>
                {item.checked ? '✓' : ''}
              </span>
            </button>
          ))}
        </ScrollArea>

        <ActionBar>
          <Button onClick={handleStart} size="lg" fullWidth>
            홈으로 시작하기
            <ChevronRight size={16} />
          </Button>
        </ActionBar>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="STEP 1 / 2"
        title="응원팀을 선택해주세요"
        description="팀 환경 리그 순위 연동을 위해 필수로 선택합니다"
      />

      <ScrollArea>
        <div className="cb-team-grid">
          {KBO_TEAMS.map((team) => {
            const isSelected = selected === team.name;
            return (
              <button
                key={team.name}
                onClick={() => setSelected(isSelected ? null : team.name)}
                className={cx('cb-team-card', isSelected && 'is-selected')}
              >
                <div className="cb-team-card__badge">
                  <TeamBadge teamName={team.name} size={34} />
                </div>
                <p className="cb-team-card__name">
                  {team.name}
                </p>
                {isSelected && (
                  <div className="cb-check-dot">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <ActionBar>
        <Button
          onClick={() => selected && setStep('permissions')}
          variant={selected ? 'primary' : 'soft'}
          size="lg"
          fullWidth
          disabled={!selected}
        >
          {selected ? `${selected}으로 계속하기` : '팀 선택 후 계속하기'}
          <ChevronRight size={16} />
        </Button>
      </ActionBar>
    </Screen>
  );
}
