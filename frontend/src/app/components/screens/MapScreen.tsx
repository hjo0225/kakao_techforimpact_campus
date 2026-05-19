import { useMemo, useState } from 'react';
import { Info, Store, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../../AppContext';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';

const PLACE_TABS = ['구장 내부', '외부 식당'] as const;

type PlaceTab = (typeof PLACE_TABS)[number];
type SpotKind = 'store' | 'partner';

interface MenuItem {
  name: string;
  price: string;
  icon: string;
}

interface Spot {
  id: string;
  kind: SpotKind;
  x: number;
  y: number;
  title: string;
  shortLabel: string;
  location: string;
  distance: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  note: string;
  hours: string;
  walkTime?: string;
  menu: MenuItem[];
}

const STORES: Spot[] = [
  {
    id: 'store-central-2f',
    kind: 'store',
    x: 168,
    y: 152,
    title: '중앙 매점',
    shortLabel: '중앙',
    location: '2층 중앙 푸드코트',
    distance: '18m',
    badge: '영업 중',
    badgeColor: 'var(--cb-primary-deep)',
    badgeBg: 'var(--cb-primary-soft)',
    note: '다회용기 보증금 결제에 자동 포함 · 컵 반납 안내 스티커 비치',
    hours: '7회말 종료 전까지',
    menu: [
      { name: '클래식 버거 세트', price: '9,800원', icon: '🍔' },
      { name: '치즈 핫도그', price: '5,500원', icon: '🌭' },
      { name: '제로 콜라', price: '3,000원', icon: '🥤' },
      { name: '감자튀김', price: '4,200원', icon: '🍟' },
    ],
  },
  {
    id: 'store-firstbase-2f',
    kind: 'store',
    x: 236,
    y: 114,
    title: '1루 스낵바',
    shortLabel: '1루',
    location: '2층 1루 내야 복도',
    distance: '34m',
    badge: '대기 짧음',
    badgeColor: '#B07800',
    badgeBg: '#FFF6D8',
    note: '줄이 짧아 하프타임 주문 추천',
    hours: '경기 종료 30분 전까지',
    menu: [
      { name: '순살 치킨 (스몰)', price: '8,500원', icon: '🍗' },
      { name: '왕감자', price: '4,500원', icon: '🥔' },
      { name: '생수 500ml', price: '1,500원', icon: '💧' },
    ],
  },
  {
    id: 'store-thirdbase-3f',
    kind: 'store',
    x: 96,
    y: 96,
    title: '3루 스낵존',
    shortLabel: '3루',
    location: '3층 3루 응원석 뒤',
    distance: '22m',
    badge: '영업 중',
    badgeColor: 'var(--cb-primary-deep)',
    badgeBg: 'var(--cb-primary-soft)',
    note: '좌석에서 가장 가까운 다회용기 매장',
    hours: '8회초 종료 전까지',
    menu: [
      { name: '즉석 떡볶이', price: '6,000원', icon: '🌶️' },
      { name: '츄러스', price: '3,500원', icon: '🥨' },
      { name: '복숭아 아이스티', price: '3,800원', icon: '🍑' },
    ],
  },
  {
    id: 'store-center-3f',
    kind: 'store',
    x: 170,
    y: 72,
    title: '중앙 키오스크',
    shortLabel: '중앙',
    location: '3층 중앙 계단 앞',
    distance: '26m',
    badge: '주문 가능',
    badgeColor: 'var(--cb-primary)',
    badgeBg: 'var(--cb-primary-soft)',
    note: '간단 메뉴 위주 · 키오스크 셀프 주문',
    hours: '경기 종료 1시간 전까지',
    menu: [
      { name: '에그 샌드위치', price: '5,800원', icon: '🥪' },
      { name: '아메리카노', price: '3,500원', icon: '☕' },
      { name: '생수 500ml', price: '1,500원', icon: '💧' },
    ],
  },
];

const PARTNER_RESTAURANTS: Spot[] = [
  {
    id: 'partner-bistro',
    kind: 'partner',
    x: 70,
    y: 188,
    title: '리턴컵 비스트로',
    shortLabel: '비스트로',
    location: '잠실새내역 4번 출구 방향',
    distance: '도보 8분',
    badge: '영업 중',
    badgeColor: '#6D28D9',
    badgeBg: '#F3E8FF',
    note: '경기 티켓 제시 시 음료 10% 할인',
    hours: '11:00 - 22:30',
    walkTime: '8분',
    menu: [
      { name: '토마토 파스타', price: '13,000원', icon: '🍝' },
      { name: '시저 샐러드', price: '11,500원', icon: '🥗' },
      { name: '레몬 탄산수', price: '4,500원', icon: '🍋' },
    ],
  },
  {
    id: 'partner-bunsik',
    kind: 'partner',
    x: 154,
    y: 202,
    title: '새활용 분식',
    shortLabel: '분식',
    location: '종합운동장역 9번 출구 방향',
    distance: '도보 6분',
    badge: '라스트 오더 전',
    badgeColor: '#7C3AED',
    badgeBg: '#F3E8FF',
    note: '포장컵 대신 다회용컵 제공',
    hours: '10:30 - 21:30',
    walkTime: '6분',
    menu: [
      { name: '국물 떡볶이', price: '5,500원', icon: '🌶️' },
      { name: '참치 김밥', price: '4,000원', icon: '🍙' },
      { name: '오뎅탕', price: '5,000원', icon: '🍢' },
    ],
  },
  {
    id: 'partner-burger',
    kind: 'partner',
    x: 248,
    y: 188,
    title: '그린 더그아웃 버거',
    shortLabel: '버거',
    location: '1루 메인게이트 맞은편',
    distance: '도보 9분',
    badge: '영업 중',
    badgeColor: '#6D28D9',
    badgeBg: '#F3E8FF',
    note: '매장 반납함과 앱 인증 스탬프 연동 예정',
    hours: '11:30 - 23:00',
    walkTime: '9분',
    menu: [
      { name: '식물성 와퍼', price: '10,500원', icon: '🍔' },
      { name: '트러플 감자', price: '6,000원', icon: '🍟' },
      { name: '생맥주 500ml', price: '6,500원', icon: '🍺' },
    ],
  },
];

const ALL_SPOTS: Spot[] = [...STORES, ...PARTNER_RESTAURANTS];

export function MapScreen() {
  const { selectedGame, seatInfo } = useApp();
  const [placeTab, setPlaceTab] = useState<PlaceTab>('구장 내부');
  const [selectedSpotId, setSelectedSpotId] = useState<string>(STORES[0].id);

  const visibleSpots = useMemo(
    () => (placeTab === '구장 내부' ? STORES : PARTNER_RESTAURANTS),
    [placeTab],
  );

  const selectedSpot = useMemo(
    () => visibleSpots.find((spot) => spot.id === selectedSpotId) ?? visibleSpots[0],
    [visibleSpots, selectedSpotId],
  );

  const handlePickSpot = (spot: Spot) => {
    setSelectedSpotId(spot.id);
    setPlaceTab(spot.kind === 'partner' ? '외부 식당' : '구장 내부');
  };

  const handleTabChange = (tab: PlaceTab) => {
    setPlaceTab(tab);
    const next = tab === '구장 내부' ? STORES[0] : PARTNER_RESTAURANTS[0];
    setSelectedSpotId(next.id);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', position: 'relative' }}>
      <StatusBar centerLabel="지도" />

      <div style={{ padding: '10px 16px 12px', background: 'transparent' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: '0 0 92px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{
              flex: 1,
              background: 'var(--cb-surface)',
              border: '2px solid #430A21',
              borderRadius: 'var(--cb-radius-md)',
              padding: '10px 12px',
              boxShadow: '0 2px 0 0 #430A21',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 3, fontWeight: 700, letterSpacing: '0.04em' }}>구장</p>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#430A21', lineHeight: 1.25 }}>
                {(selectedGame?.venue ?? '잠실 야구장').split(' ')[0]}
              </p>
            </div>
            <div style={{
              flex: 1,
              background: 'var(--cb-surface)',
              border: '2px solid #430A21',
              borderRadius: 'var(--cb-radius-md)',
              padding: '10px 12px',
              boxShadow: '0 2px 0 0 #430A21',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 3, fontWeight: 700, letterSpacing: '0.04em' }}>좌석</p>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#430A21', lineHeight: 1.25 }}>
                {seatInfo.section || '미입력'}
                {seatInfo.seatNumber && (
                  <span style={{ fontSize: 10, color: '#5E1530', marginLeft: 4, fontWeight: 700 }}>
                    {seatInfo.seatNumber}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={{
            flex: 1,
            aspectRatio: '1.55 / 1',
            minWidth: 0,
            background: 'var(--cb-bg-soft)',
            border: '2px solid #430A21',
            borderRadius: 'var(--cb-radius-md)',
            boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
            padding: 4,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="mini-field" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F8EAC9" />
                  <stop offset="100%" stopColor="#F0E8E7" />
                </linearGradient>
              </defs>
              <ellipse cx="100" cy="58" rx="88" ry="48" fill="#FFFCF6" stroke="#E8DEDE" strokeWidth="1.5" />
              <ellipse cx="100" cy="58" rx="70" ry="38" fill="#FAF5EF" stroke="#F0E8E7" strokeWidth="1" />
              <ellipse cx="100" cy="58" rx="50" ry="26" fill="#F8EAC9" stroke="#F2A2AD" strokeWidth="1" />
              <ellipse cx="100" cy="60" rx="34" ry="17" fill="url(#mini-field)" stroke="#DD7386" strokeWidth="1" />
              <polygon points="100,46 114,60 100,74 86,60" fill="#FBE6EA" stroke="#DD7386" strokeWidth="1" />
              <circle cx="100" cy="108" r="4.5" fill="#430A21" stroke="#fff" strokeWidth="1.5" />
              <text x="100" y="124" textAnchor="middle" fontSize="8" fill="#430A21" fontWeight="700">내 좌석</text>

              {ALL_SPOTS.map((spot) => {
                const x = (spot.x * 200) / 340;
                const y = (spot.y * 130) / 228;
                const color = spot.kind === 'store' ? '#C85C77' : '#7C3AED';
                const isSelected = selectedSpotId === spot.id;
                return (
                  <g key={spot.id} onClick={() => handlePickSpot(spot)} style={{ cursor: 'pointer' }}>
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={8}
                        fill={spot.kind === 'store' ? 'rgba(200, 92, 119, 0.28)' : 'rgba(124, 58, 237, 0.28)'}
                        stroke={color}
                        strokeWidth="1"
                      />
                    )}
                    <circle cx={x} cy={y} r={4} fill={color} stroke="#fff" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div style={{
          marginTop: 10,
          background: selectedSpot.kind === 'store' ? 'var(--cb-primary-soft)' : '#F3E8FF',
          border: `2px solid ${selectedSpot.kind === 'store' ? 'var(--cb-primary-border)' : '#7C3AED'}`,
          borderRadius: 'var(--cb-radius-md)',
          padding: '10px 14px',
          boxShadow: `0 2px 0 0 ${selectedSpot.kind === 'store' ? 'var(--cb-primary-border)' : '#7C3AED'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, marginBottom: 2 }}>내 위치 기준</p>
            <p style={{
              fontSize: 13,
              fontWeight: 900,
              color: selectedSpot.kind === 'store' ? 'var(--cb-primary-deep)' : '#6D28D9',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {selectedSpot.title}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700, marginBottom: 2 }}>
              {selectedSpot.kind === 'store' ? '거리' : '도보'}
            </p>
            <p style={{
              fontSize: 16,
              fontWeight: 900,
              color: selectedSpot.kind === 'store' ? 'var(--cb-primary-deep)' : '#6D28D9',
              lineHeight: 1,
            }}>
              {selectedSpot.kind === 'store' ? selectedSpot.distance : (selectedSpot.walkTime ?? selectedSpot.distance)}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        padding: '6px 16px 10px',
        background: 'transparent',
      }}>
        {PLACE_TABS.map((tab) => {
          const active = placeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              style={{
                flex: 1,
                minHeight: 40,
                padding: '8px 14px',
                border: '2px solid #430A21',
                borderRadius: 'var(--cb-radius-md)',
                background: active
                  ? 'linear-gradient(180deg, #F2A2AD 0%, #DD7386 100%)'
                  : 'var(--cb-surface)',
                color: active ? '#fff' : '#430A21',
                fontSize: 13,
                fontWeight: active ? 900 : 700,
                cursor: 'pointer',
                boxShadow: active
                  ? '0 3px 0 0 #430A21'
                  : '0 2px 0 0 #430A21',
                transform: active ? 'translateY(-1px)' : 'none',
                transition: 'transform 80ms ease, box-shadow 80ms ease',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div
        className="hide-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: '10px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{
          background: '#fff',
          borderRadius: 'var(--cb-radius-lg)',
          padding: '14px 16px',
          border: `2px solid ${selectedSpot.kind === 'store' ? 'var(--cb-primary-border)' : '#7C3AED'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--cb-radius-md)',
              background: selectedSpot.kind === 'store' ? 'var(--cb-primary-soft)' : '#F3E8FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1.5px solid #430A21',
            }}>
              {selectedSpot.kind === 'store'
                ? <Store size={18} color="var(--cb-primary)" />
                : <UtensilsCrossed size={18} color="#7C3AED" />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{selectedSpot.title}</p>
              <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45, marginTop: 2 }}>{selectedSpot.note}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1,
              background: '#F8FAFC',
              borderRadius: 'var(--cb-radius-md)',
              padding: '10px 12px',
              minWidth: 0,
              border: '2px solid #430A21',
              boxShadow: '0 2px 0 0 #430A21',
            }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>운영 시간</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>{selectedSpot.hours}</p>
            </div>
            <div style={{
              flex: 1,
              background: '#F8FAFC',
              borderRadius: 'var(--cb-radius-md)',
              padding: '10px 12px',
              minWidth: 0,
              border: '2px solid #430A21',
              boxShadow: '0 2px 0 0 #430A21',
            }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>
                {selectedSpot.kind === 'store' ? '위치' : '도보'}
              </p>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>
                {selectedSpot.kind === 'store' ? selectedSpot.location : (selectedSpot.walkTime ?? selectedSpot.distance)}
              </p>
            </div>
          </div>

          <div>
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              color: selectedSpot.kind === 'store' ? 'var(--cb-primary-deep)' : '#6D28D9',
              marginBottom: 8,
            }}
            >
              대표 메뉴
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedSpot.menu.map((item) => (
                <div key={item.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: '#FAFAFB',
                  borderRadius: 'var(--cb-radius-md)',
                  border: '2px solid #430A21',
                  boxShadow: '0 2px 0 0 #430A21',
                }}>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--cb-radius-sm)',
                      background: '#fff',
                      border: '1.5px solid #430A21',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <p style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.4 }}>{item.name}</p>
                  <p style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: selectedSpot.kind === 'store' ? 'var(--cb-primary-deep)' : '#6D28D9',
                    flexShrink: 0,
                  }}
                  >
                    {item.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleSpots.map((spot) => {
            const isActive = selectedSpot.id === spot.id;
            const preview = spot.menu.slice(0, 2).map((m) => m.name).join(' · ');
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => handlePickSpot(spot)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: isActive
                    ? (spot.kind === 'store' ? 'var(--cb-bg-soft)' : '#FBF7FF')
                    : '#fff',
                  borderRadius: 'var(--cb-radius-lg)',
                  padding: '14px',
                  border: isActive
                    ? `2px solid ${spot.kind === 'store' ? 'var(--cb-primary-border)' : '#7C3AED'}`
                    : '2px solid #430A21',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  boxShadow: isActive
                    ? '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)'
                    : '0 2px 0 0 #430A21',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--cb-radius-md)',
                  background: spot.kind === 'store' ? 'var(--cb-primary-soft)' : '#F3E8FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1.5px solid #430A21',
                }}>
                  {spot.kind === 'store'
                    ? <Store size={18} color="var(--cb-primary)" />
                    : <UtensilsCrossed size={18} color="#7C3AED" />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{spot.title}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: spot.badgeColor,
                      background: spot.badgeBg,
                      padding: '3px 8px',
                      borderRadius: 'var(--cb-radius-full)',
                      border: `1.5px solid ${spot.badgeColor}`,
                    }}
                    >
                      {spot.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>{preview}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>
                    {spot.kind === 'store' ? '거리' : '도보'}
                  </p>
                  <p style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: spot.kind === 'store' ? 'var(--cb-primary-deep)' : '#6D28D9',
                  }}
                  >
                    {spot.kind === 'store' ? spot.distance : (spot.walkTime ?? spot.distance)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{
          background: '#F8FAFC',
          borderRadius: 'var(--cb-radius-md)',
          border: '2px solid #430A21',
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          boxShadow: '0 2px 0 0 #430A21',
        }}>
          <Info size={15} color="#94A3B8" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
            메뉴 가격과 영업 상태는 경기 시간대 기준 예시 데이터입니다. 다회용기 보증금은 결제 시 자동 포함되며, 매장 또는 반납함에서 반납하면 환불됩니다.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
