import { useMemo, useState } from 'react';
import { ChevronDown, Info, MapPin, Navigation, Recycle, Store, UtensilsCrossed, X } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useNavigation } from '../../navigation';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';

const FLOORS = ['2층', '3층'] as const;
const PLACE_TABS = ['구장 내부', '협력 식당'] as const;

type Floor = (typeof FLOORS)[number];
type PlaceTab = (typeof PLACE_TABS)[number];
type LayerKey = 'store' | 'bin' | 'partner';

interface LayerMeta {
  key: LayerKey;
  label: string;
  color: string;
}

interface Spot {
  id: string;
  kind: LayerKey;
  floors: Floor[];
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
  menu?: string;
  hours?: string;
  walkTime?: string;
  congestion?: string;
}

const LAYERS: LayerMeta[] = [
  { key: 'store', label: '다회용기 매장', color: '#0F9F8B' },
  { key: 'bin', label: '반납함', color: '#2563EB' },
  { key: 'partner', label: '협력 식당', color: '#7C3AED' },
];

const STORES: Spot[] = [
  {
    id: 'store-central-2f',
    kind: 'store',
    floors: ['2층'],
    x: 168,
    y: 152,
    title: '중앙 매점',
    shortLabel: '중앙',
    location: '2층 중앙 푸드코트',
    distance: '18m',
    badge: '영업 중',
    badgeColor: '#13923F',
    badgeBg: '#E8F8EE',
    note: '다회용기 보증금 자동 포함 · 컵 반납 안내 스티커 비치',
    menu: '다회용기 버거 세트 · 제로콜라',
    hours: '7회말 종료 전까지',
  },
  {
    id: 'store-firstbase-2f',
    kind: 'store',
    floors: ['2층'],
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
    menu: '순살치킨 · 감자 · 생수',
    hours: '경기 종료 30분 전까지',
  },
  {
    id: 'store-thirdbase-3f',
    kind: 'store',
    floors: ['3층'],
    x: 96,
    y: 96,
    title: '3층 3루 스낵존',
    shortLabel: '3루',
    location: '3층 3루 응원석 뒤',
    distance: '22m',
    badge: '영업 중',
    badgeColor: '#13923F',
    badgeBg: '#E8F8EE',
    note: '좌석에서 가장 가까운 다회용기 매장',
    menu: '떡볶이 · 츄러스 · 아이스티',
    hours: '8회초 종료 전까지',
  },
  {
    id: 'store-center-3f',
    kind: 'store',
    floors: ['3층'],
    x: 170,
    y: 72,
    title: '3층 중앙 키오스크',
    shortLabel: '중앙',
    location: '3층 중앙 계단 앞',
    distance: '26m',
    badge: '주문 가능',
    badgeColor: '#0F9F8B',
    badgeBg: '#E6FFFA',
    note: '간단 메뉴 위주 · 반납함 동선과 연결',
    menu: '샌드위치 · 커피 · 생수',
    hours: '경기 종료 1시간 전까지',
  },
];

const RETURN_BINS: Spot[] = [
  {
    id: 'bin-third-2f',
    kind: 'bin',
    floors: ['2층'],
    x: 102,
    y: 66,
    title: 'C게이트 반납함',
    shortLabel: 'C게이트',
    location: '2층 3루 복도',
    distance: '18m',
    badge: '보통',
    badgeColor: '#B07800',
    badgeBg: '#FFF6D8',
    note: '좌석 기준 가장 빠른 반납 동선',
    congestion: '대기 2~3명',
  },
  {
    id: 'bin-first-2f',
    kind: 'bin',
    floors: ['2층'],
    x: 248,
    y: 66,
    title: 'A게이트 반납함',
    shortLabel: 'A게이트',
    location: '2층 1루 복도',
    distance: '31m',
    badge: '원활',
    badgeColor: '#13923F',
    badgeBg: '#E8F8EE',
    note: '대기 없이 반납 가능한 편',
    congestion: '즉시 반납 가능',
  },
  {
    id: 'bin-third-3f',
    kind: 'bin',
    floors: ['3층'],
    x: 104,
    y: 78,
    title: '3층 3루 반납함',
    shortLabel: '3루',
    location: '3층 3루 계단 옆',
    distance: '14m',
    badge: '원활',
    badgeColor: '#13923F',
    badgeBg: '#E8F8EE',
    note: '응원석 이용객 우선 반납 위치',
    congestion: '즉시 반납 가능',
  },
  {
    id: 'bin-first-3f',
    kind: 'bin',
    floors: ['3층'],
    x: 236,
    y: 78,
    title: '3층 1루 반납함',
    shortLabel: '1루',
    location: '3층 1루 계단 옆',
    distance: '21m',
    badge: '혼잡',
    badgeColor: '#D14343',
    badgeBg: '#FFF1F1',
    note: '7회 이후 혼잡도가 빠르게 올라갑니다',
    congestion: '대기 5명 이상',
  },
];

const PARTNER_RESTAURANTS: Spot[] = [
  {
    id: 'partner-bistro',
    kind: 'partner',
    floors: ['2층', '3층'],
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
    menu: '파스타 · 샐러드 · 탄산수',
    hours: '11:00 - 22:30',
    walkTime: '8분',
  },
  {
    id: 'partner-bunsik',
    kind: 'partner',
    floors: ['2층', '3층'],
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
    menu: '떡볶이 · 김밥 · 어묵',
    hours: '10:30 - 21:30',
    walkTime: '6분',
  },
  {
    id: 'partner-burger',
    kind: 'partner',
    floors: ['2층', '3층'],
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
    menu: '식물성 버거 · 감자 · 생맥주',
    hours: '11:30 - 23:00',
    walkTime: '9분',
  },
];

const MAP_ROUTE_POINTS: Record<string, string> = {
  'bin-third-2f': '104,152 96,124 96,96 102,66',
  'bin-first-2f': '236,152 244,126 248,96 248,66',
  'bin-third-3f': '100,114 102,98 104,78',
  'bin-first-3f': '238,114 238,98 236,78',
};

function getSeatPoint(floor: Floor, section?: string) {
  if (floor === '2층') {
    if (section?.includes('3루')) return { x: 104, y: 152, label: section };
    if (section?.includes('1루')) return { x: 236, y: 152, label: section };
    if (section?.includes('외야')) return { x: 170, y: 84, label: section };
    return { x: 170, y: 150, label: section || '좌석 미입력' };
  }

  if (section?.includes('3루')) return { x: 100, y: 114, label: section };
  if (section?.includes('1루')) return { x: 238, y: 114, label: section };
  if (section?.includes('외야')) return { x: 170, y: 60, label: section };
  return { x: 170, y: 116, label: section || '좌석 미입력' };
}

function getRecommendedBin(floor: Floor, section?: string) {
  if (floor === '2층') {
    return section?.includes('1루') ? RETURN_BINS.find((spot) => spot.id === 'bin-first-2f')! : RETURN_BINS.find((spot) => spot.id === 'bin-third-2f')!;
  }

  return section?.includes('1루') ? RETURN_BINS.find((spot) => spot.id === 'bin-first-3f')! : RETURN_BINS.find((spot) => spot.id === 'bin-third-3f')!;
}

function getSpotShape(spot: Spot) {
  if (spot.kind === 'store') return { fill: '#0F9F8B', stroke: '#D1FAF5', label: '매장' };
  if (spot.kind === 'partner') return { fill: '#7C3AED', stroke: '#F3E8FF', label: '식당' };
  return { fill: '#2563EB', stroke: '#DBEAFE', label: '반납' };
}

function getLayerCount(layer: LayerKey, floor: Floor) {
  const source = layer === 'store' ? STORES : layer === 'bin' ? RETURN_BINS : PARTNER_RESTAURANTS;
  return source.filter((spot) => spot.floors.includes(floor)).length;
}

export function MapScreen() {
  const { selectedGame, seatInfo } = useApp();
  const { navigate } = useNavigation();
  const [activeFloor, setActiveFloor] = useState<Floor>('2층');
  const [placeTab, setPlaceTab] = useState<PlaceTab>('구장 내부');
  const [selectedSpotId, setSelectedSpotId] = useState<string>('bin-third-2f');
  const [showRoute, setShowRoute] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [layerState, setLayerState] = useState<Record<LayerKey, boolean>>({
    store: true,
    bin: true,
    partner: false,
  });

  const seatPoint = useMemo(() => getSeatPoint(activeFloor, seatInfo.section), [activeFloor, seatInfo.section]);
  const recommendedBin = useMemo(() => getRecommendedBin(activeFloor, seatInfo.section), [activeFloor, seatInfo.section]);

  const visibleSpots = useMemo(() => (
    [...STORES, ...RETURN_BINS, ...PARTNER_RESTAURANTS].filter((spot) => (
      spot.floors.includes(activeFloor) && layerState[spot.kind]
    ))
  ), [activeFloor, layerState]);

  const highlightedSpots = useMemo(() => (
    placeTab === '구장 내부'
      ? [...RETURN_BINS, ...STORES].filter((spot) => spot.floors.includes(activeFloor))
      : PARTNER_RESTAURANTS
  ), [activeFloor, placeTab]);

  const selectedSpot = useMemo(() => {
    return highlightedSpots.find((spot) => spot.id === selectedSpotId)
      || (placeTab === '협력 식당'
        ? PARTNER_RESTAURANTS[0]
        : highlightedSpots.find((spot) => spot.id === recommendedBin.id) || recommendedBin);
  }, [highlightedSpots, placeTab, recommendedBin, selectedSpotId]);

  const routePoints = MAP_ROUTE_POINTS[recommendedBin.id];

  const currentVenueLabel = selectedGame
    ? `${selectedGame.venue.split(' ')[0]} · ${selectedGame.home} vs ${selectedGame.away}`
    : '잠실 · 경기 전 사전 확인';

  const handleLayerToggle = (key: LayerKey) => {
    if (key === 'bin' && layerState.bin) {
      setShowRoute(false);
    }
    setLayerState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePickSpot = (spot: Spot) => {
    if (!layerState[spot.kind]) {
      setLayerState((prev) => ({ ...prev, [spot.kind]: true }));
    }
    setSelectedSpotId(spot.id);
    if (spot.kind === 'partner') {
      setPlaceTab('협력 식당');
    } else {
      setPlaceTab('구장 내부');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2FBF5', position: 'relative' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <StatusBar centerLabel="지도" />
      </div>

      <div style={{
        padding: '10px 20px 12px',
        background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
              {selectedGame ? '현재 관람' : '사전 확인'}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#13923F', lineHeight: 1.35 }}>{currentVenueLabel}</p>
          </div>
          <div style={{
            background: '#F4FCF6',
            borderRadius: 12,
            border: '1px solid #CDEFD9',
            padding: '8px 10px',
            minWidth: 88,
            flexShrink: 0,
          }}>
            <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>기준 좌석</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
              {seatInfo.section || '미입력'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 4,
            borderRadius: 14,
            background: '#F4F6F8',
            border: '1px solid #E3E5E8',
          }}>
            {FLOORS.map((floor) => {
              const isActive = activeFloor === floor;
              return (
                <button
                  key={floor}
                  type="button"
                  onClick={() => {
                    setActiveFloor(floor);
                    setSelectedSpotId(getRecommendedBin(floor, seatInfo.section).id);
                  }}
                  style={{
                    minWidth: 52,
                    height: 44,
                    border: 0,
                    borderRadius: 10,
                    background: isActive ? '#3DDB6D' : 'transparent',
                    color: isActive ? '#fff' : '#6B7280',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 4px 10px rgba(61,219,109,0.24)' : 'none',
                  }}
                >
                  {floor}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowRoute((prev) => !prev);
              setSelectedSpotId(recommendedBin.id);
              setPlaceTab('구장 내부');
            }}
            style={{
              border: 0,
              borderRadius: 12,
              padding: '8px 14px',
              minHeight: 44,
              background: showRoute ? '#E8F8EE' : '#EFF5F1',
              color: showRoute ? '#13923F' : '#5F6C66',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Navigation size={14} />
            좌석 기준 동선
            <ChevronDown size={14} style={{ transform: showRoute ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>
        </div>

        <div
          className="hide-scroll"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {LAYERS.map((layer) => {
            const active = layerState[layer.key];
            return (
              <button
                key={layer.key}
                type="button"
                onClick={() => handleLayerToggle(layer.key)}
                style={{
                  padding: '8px 14px',
                  minHeight: 44,
                  borderRadius: 14,
                  border: active ? `1.5px solid ${layer.color}` : '1.5px solid #E3E5E8',
                  background: active ? `${layer.color}14` : '#fff',
                  color: active ? layer.color : '#6B7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: layer.key === 'bin' ? 3 : '50%', background: layer.color, flexShrink: 0 }} />
                <span>{layer.label}</span>
                <span style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  padding: '0 6px',
                  background: active ? '#fff' : '#F3F4F6',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: active ? layer.color : '#9CA3AF',
                }}
                >
                  {getLayerCount(layer.key, activeFloor)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', flex: '0 0 268px', background: 'linear-gradient(180deg, #E6F7EC 0%, #DFF3E6 100%)' }}>
        <svg viewBox="0 0 340 228" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="field" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B8EFCB" />
              <stop offset="100%" stopColor="#97E4B0" />
            </linearGradient>
          </defs>

          <ellipse cx="170" cy="114" rx="136" ry="92" fill="#F8FCF9" stroke="#B7E4C5" strokeWidth="2" />
          <ellipse cx="170" cy="114" rx={activeFloor === '2층' ? 120 : 128} ry={activeFloor === '2층' ? 80 : 86} fill={activeFloor === '2층' ? '#EEF8F1' : '#F4FAF6'} stroke="#D5EEDF" strokeWidth="1.5" />
          <ellipse cx="170" cy="114" rx={activeFloor === '2층' ? 96 : 112} ry={activeFloor === '2층' ? 62 : 70} fill={activeFloor === '2층' ? '#E2F5E8' : '#ECF7EF'} stroke="#CEE9D7" strokeWidth="1.5" />
          <path d="M92 148 Q170 188 248 148" fill="none" stroke="#D7ECDD" strokeWidth="18" strokeLinecap="round" opacity="0.9" />
          <path d="M92 82 Q170 38 248 82" fill="none" stroke="#D7ECDD" strokeWidth={activeFloor === '2층' ? 14 : 18} strokeLinecap="round" opacity={activeFloor === '2층' ? 0.5 : 0.9} />
          <ellipse cx="170" cy="116" rx="68" ry="52" fill="url(#field)" stroke="#7FD49D" strokeWidth="1.5" />
          <polygon points="170,78 196,104 170,130 144,104" fill="#E8FAED" stroke="#7FD49D" strokeWidth="1.2" />
          {[[170, 78], [196, 104], [170, 130], [144, 104]].map(([x, y], index) => (
            <rect key={index} x={x - 4} y={y - 4} width="8" height="8" rx="1.6" fill="#FFFFFF" stroke="#46B86B" strokeWidth="1.2" />
          ))}

          <text x="48" y="72" fontSize="8" fill="#6B7280" fontWeight="700">3루</text>
          <text x="284" y="72" fontSize="8" fill="#6B7280" fontWeight="700">1루</text>
          <text x="159" y="196" fontSize="8" fill="#6B7280" fontWeight="700">메인 입구</text>

          {showRoute && (
            <polyline
              points={routePoints}
              fill="none"
              stroke="#13923F"
              strokeWidth="3"
              strokeDasharray="6 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {visibleSpots.map((spot) => {
            const shape = getSpotShape(spot);
            const isSelected = selectedSpot.id === spot.id;
            const labelWidth = Math.max(34, spot.shortLabel.length * 8 + 14);

            return (
              <g key={spot.id} onClick={() => handlePickSpot(spot)} style={{ cursor: 'pointer' }}>
                {isSelected && (
                  <circle
                    cx={spot.x}
                    cy={spot.y}
                    r={spot.kind === 'partner' ? 16 : 14}
                    fill={`${shape.fill}22`}
                    stroke={`${shape.fill}55`}
                    strokeWidth="1.2"
                  />
                )}

                {spot.kind === 'bin' ? (
                  <rect x={spot.x - 8} y={spot.y - 8} width="16" height="16" rx="4" fill={shape.fill} stroke="#fff" strokeWidth="2" />
                ) : (
                  <circle cx={spot.x} cy={spot.y} r={7.5} fill={shape.fill} stroke="#fff" strokeWidth="2" />
                )}

                <text x={spot.x} y={spot.y + 2.5} textAnchor="middle" fill="#fff" fontSize="5.8" fontWeight="700">
                  {shape.label}
                </text>

                {isSelected && (
                  <>
                    <rect x={spot.x - labelWidth / 2} y={spot.y - 26} width={labelWidth} height="16" rx="8" fill="#FFFFFF" stroke={shape.fill} strokeWidth="1.2" />
                    <text x={spot.x} y={spot.y - 15} textAnchor="middle" fill="#111827" fontSize="7" fontWeight="700">
                      {spot.shortLabel}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          <g>
            <circle cx={seatPoint.x} cy={seatPoint.y} r="12" fill="rgba(61,219,109,0.18)" />
            <circle cx={seatPoint.x} cy={seatPoint.y} r="6.8" fill="#3DDB6D" stroke="#fff" strokeWidth="2" />
            <rect x={seatPoint.x - 25} y={seatPoint.y + 10} width="50" height="16" rx="8" fill="#FFFFFF" stroke="#BDE7C7" strokeWidth="1.2" />
            <text x={seatPoint.x} y={seatPoint.y + 21} textAnchor="middle" fill="#13923F" fontSize="7" fontWeight="700">내 좌석</text>
          </g>
        </svg>

        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(255,255,255,0.94)',
          borderRadius: 12,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        }}>
          {[
            { color: '#0F9F8B', label: '매장' },
            { color: '#2563EB', label: '반납함' },
            { color: '#7C3AED', label: '식당' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: item.label === '반납함' ? 2 : '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#4B5563', fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 10,
          background: 'rgba(255,255,255,0.96)',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.05)',
          padding: '12px 14px',
          boxShadow: '0 10px 24px rgba(0,0,0,0.10)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.3 }}>{selectedSpot.title}</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 999,
                  padding: '3px 8px',
                  background: selectedSpot.badgeBg,
                  color: selectedSpot.badgeColor,
                  fontSize: 10,
                  fontWeight: 700,
                }}
                >
                  {selectedSpot.badge}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{selectedSpot.location}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>거리</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#13923F' }}>{selectedSpot.distance}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="hide-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: `12px 20px ${showGuide ? 220 : 24}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{
          background: '#FFFFFF',
          borderRadius: 18,
          padding: '14px 16px',
          border: '1.5px solid #CDEFD9',
          boxShadow: '0 6px 18px rgba(61,219,109,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#13923F', fontWeight: 700, marginBottom: 4 }}>좌석 기준 가장 가까운 반납함</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{recommendedBin.title}</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.45 }}>
                {seatInfo.section || '좌석 미입력'} 기준 {recommendedBin.distance} · {recommendedBin.congestion}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowRoute((prev) => !prev);
                setSelectedSpotId(recommendedBin.id);
                setPlaceTab('구장 내부');
              }}
              style={{
                border: 0,
                borderRadius: 12,
                background: '#E8F8EE',
                color: '#13923F',
                width: 44,
                height: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label="가장 가까운 반납함 경로 보기"
            >
              <Navigation size={18} />
            </button>
          </div>

          {showRoute && (
            <div style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}>
              {[
                { label: '출발', value: seatInfo.section || '좌석 미입력' },
                { label: '도착', value: recommendedBin.shortLabel },
                { label: '혼잡도', value: recommendedBin.badge },
              ].map((item) => (
                <div key={item.label} style={{ background: '#F7FBF8', borderRadius: 12, padding: '10px 8px', border: '1px solid #E5F3EA' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          background: '#F4F6F8',
          borderRadius: 14,
          border: '1px solid #E3E5E8',
          width: 'fit-content',
        }}>
          {PLACE_TABS.map((tab) => {
            const active = placeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setPlaceTab(tab);
                  if (tab === '협력 식당' && !layerState.partner) {
                    setLayerState((prev) => ({ ...prev, partner: true }));
                  }
                }}
                style={{
                  minWidth: 104,
                  height: 44,
                  border: 0,
                  borderRadius: 10,
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#111827' : '#6B7280',
                  fontSize: 12,
                  fontWeight: 700,
                  boxShadow: active ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {placeTab === '구장 내부' ? (
          <>
            <div style={{
              background: '#fff',
              borderRadius: 18,
              padding: '14px 16px',
              border: '1px solid #E7EBEE',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: selectedSpot.kind === 'store' ? '#E6FFFA' : '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selectedSpot.kind === 'store' ? <Store size={17} color="#0F9F8B" /> : <Recycle size={17} color="#2563EB" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{selectedSpot.title}</p>
                  <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>{selectedSpot.note}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>{selectedSpot.kind === 'store' ? '대표 메뉴' : '혼잡도'}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.45 }}>
                    {selectedSpot.kind === 'store' ? selectedSpot.menu : selectedSpot.congestion}
                  </p>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>{selectedSpot.kind === 'store' ? '운영 상태' : '현재 상태'}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.45 }}>
                    {selectedSpot.kind === 'store' ? selectedSpot.hours : selectedSpot.badge}
                  </p>
                </div>
              </div>

              {selectedSpot.kind === 'bin' ? (
                <button
                  type="button"
                  onClick={() => navigate(selectedGame ? 'report' : 'game-select')}
                  style={{
                    width: '100%',
                    height: 46,
                    borderRadius: 14,
                    border: 0,
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(37,99,235,0.22)',
                  }}
                >
                  {selectedGame ? '여기서 인증하기' : '경기 선택 후 인증하기'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSpotId(recommendedBin.id);
                    setShowRoute(true);
                  }}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 14,
                    border: '1.5px solid #CDEFD9',
                    background: '#F7FBF8',
                    color: '#13923F',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  가까운 반납함 보기
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {highlightedSpots.map((spot) => {
                const isActive = selectedSpot.id === spot.id;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => handlePickSpot(spot)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: isActive ? '#F6FFFA' : '#fff',
                      borderRadius: 16,
                      padding: '14px 14px',
                      border: isActive ? '1.5px solid #BEE7CB' : '1.5px solid #E7EBEE',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 13,
                      background: spot.kind === 'store' ? '#E6FFFA' : '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {spot.kind === 'store' ? <Store size={18} color="#0F9F8B" /> : <Recycle size={18} color="#2563EB" />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{spot.title}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: spot.badgeColor,
                          background: spot.badgeBg,
                          padding: '3px 7px',
                          borderRadius: 999,
                        }}
                        >
                          {spot.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>{spot.kind === 'store' ? spot.menu : `${spot.location} · ${spot.congestion}`}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>거리</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#13923F' }}>{spot.distance}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PARTNER_RESTAURANTS.map((spot) => {
              const isActive = selectedSpot.id === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handlePickSpot(spot)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: isActive ? '#FBF7FF' : '#fff',
                    borderRadius: 16,
                    padding: '14px',
                    border: isActive ? '1.5px solid #D9C2FF' : '1.5px solid #E7EBEE',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        background: '#F3E8FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <UtensilsCrossed size={18} color="#7C3AED" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>{spot.title}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: spot.badgeColor,
                            background: spot.badgeBg,
                            padding: '3px 7px',
                            borderRadius: 999,
                          }}
                          >
                            {spot.badge}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>{spot.location}</p>
                      </div>
                    </div>

                    <div style={{
                      padding: '7px 9px',
                      borderRadius: 12,
                      background: '#F8F5FF',
                      color: '#6D28D9',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      <p style={{ fontSize: 10, marginBottom: 2 }}>도보</p>
                      <p style={{ fontSize: 13, fontWeight: 800 }}>{spot.walkTime}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    <div style={{ background: '#FAFAFB', borderRadius: 12, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>대표 메뉴</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.45 }}>{spot.menu}</p>
                    </div>
                    <div style={{ background: '#FAFAFB', borderRadius: 12, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>운영 시간</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.45 }}>{spot.hours}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={14} color="#7C3AED" />
                    <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>{spot.note}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{
          background: '#F8FAFC',
          borderRadius: 16,
          border: '1px solid #E7EBEE',
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
        }}>
          <Info size={15} color="#94A3B8" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
            혼잡도와 영업 상태는 경기 시간대 기준 예시 데이터입니다. 반납 인증은 선택한 반납함 상세에서 인증 탭으로 연결됩니다.
          </p>
        </div>
      </div>

      <BottomNav />

      {showGuide && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 84, zIndex: 30 }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.16)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px 12px',
              background: 'linear-gradient(135deg, #F4FCF6, #EEF7FF)',
              borderBottom: '1px solid #E7EBEE',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#13923F', marginBottom: 4 }}>처음 보는 분을 위한 안내</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', lineHeight: 1.35 }}>반납함과 다회용기 매장을 한 화면에서 확인하세요</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: 0,
                  background: '#fff',
                  color: '#6B7280',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="지도 사용 안내 닫기"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: <Navigation size={15} color="#13923F" />, text: '2층/3층을 바꾸면 좌석 기준으로 가장 가까운 반납함을 다시 추천합니다.' },
                { icon: <Recycle size={15} color="#2563EB" />, text: '반납함 핀을 누르면 혼잡도와 거리, 인증 버튼을 바로 확인할 수 있습니다.' },
                { icon: <Store size={15} color="#0F9F8B" />, text: '다회용기 매장과 협력 식당은 메뉴와 영업 상태까지 함께 보여줍니다.' },
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    background: '#F7FBF8',
                    border: '1px solid #E5F3EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  >
                    {item.icon}
                  </div>
                  <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.55 }}>{item.text}</p>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  setSelectedSpotId(recommendedBin.id);
                  setShowRoute(true);
                }}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 14,
                  border: 0,
                  background: 'linear-gradient(135deg, #3DDB6D, #1AB852)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 10px 22px rgba(61,219,109,0.24)',
                }}
              >
                가장 가까운 반납함부터 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
