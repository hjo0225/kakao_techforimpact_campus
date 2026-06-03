/**
 * 잠실야구장 층별 SVG 도면
 *
 * viewBox: "0 0 300 300"
 * 북쪽 위(North-up), 홈플레이트 남쪽(하단)
 * 매장 마커는 gate 정보 기반으로 외야/내야 구획에 배치
 */

import type { StadiumFloor, StadiumStore, StoreCategory } from '../../../lib/storesApi'

// ── 도형 상수 ──────────────────────────────────────────────────────────────────
const C = { x: 150, y: 150 }           // 중심
const R_OUTER      = 138               // 외벽
const R_CONCOURSE  = 122               // 통로 외측
const R_SEATING    = 105               // 관중석 외측
const R_FIELD_EDGE = 78                // 내야/외야 경계(그린)
const R_WARNING    = 70                // 워닝트랙 내측
const R_INFIELD    = 52                // 내야 그린 원형

// 홈플레이트 (남쪽 = 하단)
const HOME   = { x: 150, y: 210 }
const FIRST  = { x: 192, y: 168 }     // 1루 (동쪽)
const SECOND = { x: 150, y: 126 }     // 2루 (북쪽)
const THIRD  = { x: 108, y: 168 }     // 3루 (서쪽)
const MOUND  = { x: 150, y: 170 }     // 마운드

// 게이트 각도 (북쪽 기준, 시계방향, 단위: 도)
const GATE_ANGLES: Record<string, number> = {
  '1': 295, '2': 335, '3': 15, '4': 55,
  '5': 100, '6': 145, '7': 180, '8': 220, '9': 260,
}

function toRad(deg: number) { return (deg - 90) * Math.PI / 180 }

function gateToAngle(gateStr: string): number {
  const m = gateStr.match(/(\d+)/)
  return m ? (GATE_ANGLES[m[1]] ?? 180) : 180
}

function polarToXY(angleDeg: number, r: number) {
  const rad = toRad(angleDeg)
  return { x: C.x + r * Math.cos(rad), y: C.y + r * Math.sin(rad) }
}

// ── 카테고리 색상 ──────────────────────────────────────────────────────────────
const CAT_COLORS: Record<StoreCategory, { fill: string; stroke: string; label: string }> = {
  MEAL:        { fill: '#C85C77', stroke: '#5E1530', label: '#FFF8FB' },
  CAFE:        { fill: '#EFD49F', stroke: '#9C6A20', label: '#5C3E08' },
  CONVENIENCE: { fill: '#BFE2C9', stroke: '#4F7E4D', label: '#2A472A' },
  BEVERAGE:    { fill: '#BFD4F4', stroke: '#46639C', label: '#1F3D6B' },
}
const UNAVAIL = { fill: '#D1D5DB', stroke: '#6B7280', label: '#374151' }

function markerColor(store: StadiumStore) {
  return store.reusableContainer ? CAT_COLORS[store.category] : UNAVAIL
}

// ── 게이트 레이블 ──────────────────────────────────────────────────────────────
const GATE_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

// 층별 배경/통로 색상 변형
const FLOOR_CONCOURSE: Record<StadiumFloor, string> = {
  '1F':   '#F5EFEB',
  '2F':   '#EEF2F8',
  '2.5F': '#F2EEF8',
  '3F':   '#F0F5EE',
  '4F':   '#F5F2EE',
}

interface StadiumFloorSvgProps {
  floor: StadiumFloor
  stores: StadiumStore[]
  selectedStoreId: string | null
  onSelectStore: (store: StadiumStore) => void
}

export function StadiumFloorSvg({
  floor,
  stores,
  selectedStoreId,
  onSelectStore,
}: StadiumFloorSvgProps) {
  const concourseFill = FLOOR_CONCOURSE[floor] ?? '#F5EFEB'

  // 게이트별로 매장 그룹화하여 부채꼴 배치
  const storePositions = stores.map((store) => {
    const angle = gateToAngle(store.gate || store.nearestGate)
    // 매장은 통로(concourse) 중간 반경에 배치
    const r = R_CONCOURSE - 10
    const pos = polarToXY(angle, r)
    return { store, pos, angle }
  })

  return (
    <svg
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label={`잠실야구장 ${floor} 도면`}
    >
      {/* ── 배경 (투명) ── */}
      <rect width="300" height="300" fill="transparent" />

      {/* ── 외벽 (두꺼운 원형) ── */}
      <circle cx={C.x} cy={C.y} r={R_OUTER} fill="#DDD5CC" stroke="#B8A89C" strokeWidth="3" />

      {/* ── 통로/콩코스 ── */}
      <circle cx={C.x} cy={C.y} r={R_CONCOURSE} fill={concourseFill} stroke="#C8BEB8" strokeWidth="1.5" />

      {/* ── 관중석 ── */}
      <circle cx={C.x} cy={C.y} r={R_SEATING} fill="#E2DBD6" stroke="#C8BEB8" strokeWidth="1" />

      {/* ── 그라운드(잔디) ── */}
      <circle cx={C.x} cy={C.y} r={R_FIELD_EDGE} fill="#C8E8BE" stroke="#9CC88C" strokeWidth="1.5" />

      {/* ── 워닝트랙 ── */}
      <circle cx={C.x} cy={C.y} r={R_WARNING} fill="#D4A870" stroke="#B08040" strokeWidth="1" />

      {/* ── 내야 잔디 ── */}
      <circle cx={C.x} cy={C.y} r={R_INFIELD} fill="#B8E0A8" stroke="#88C070" strokeWidth="1" />

      {/* ── 내야 흙(다이아몬드 안쪽) ── */}
      <polygon
        points={`${HOME.x},${HOME.y} ${FIRST.x},${FIRST.y} ${SECOND.x},${SECOND.y} ${THIRD.x},${THIRD.y}`}
        fill="#D4A060"
        stroke="#B07840"
        strokeWidth="1"
      />

      {/* ── 베이스라인 ── */}
      {[
        [HOME, FIRST], [FIRST, SECOND],
        [SECOND, THIRD], [THIRD, HOME],
      ].map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke="#8C6020" strokeWidth="1.5" />
      ))}

      {/* ── 파울라인 (홈→1루, 홈→3루) ── */}
      {[
        { start: HOME, angleDeg: 45 },   // 1루 방향
        { start: HOME, angleDeg: 135 },  // 3루 방향
      ].map(({ start, angleDeg }, i) => {
        const end = polarToXY(angleDeg, R_FIELD_EDGE + 4)
        return (
          <line key={i} x1={start.x} y1={start.y} x2={end.x} y2={end.y}
            stroke="#B8902060" strokeWidth="1" strokeDasharray="3,2" />
        )
      })}

      {/* ── 마운드 ── */}
      <circle cx={MOUND.x} cy={MOUND.y} r={5} fill="#C89050" stroke="#906030" strokeWidth="1" />

      {/* ── 홈플레이트 ── */}
      <polygon
        points={`${HOME.x},${HOME.y - 5} ${HOME.x + 4},${HOME.y} ${HOME.x + 4},${HOME.y + 4} ${HOME.x - 4},${HOME.y + 4} ${HOME.x - 4},${HOME.y}`}
        fill="#FFFFFF" stroke="#888" strokeWidth="1"
      />

      {/* ── 베이스 (1,2,3루) ── */}
      {[FIRST, SECOND, THIRD].map((base, i) => (
        <rect key={i}
          x={base.x - 4} y={base.y - 4} width="8" height="8"
          fill="#FFFFFF" stroke="#888" strokeWidth="1"
          transform={`rotate(45, ${base.x}, ${base.y})`}
        />
      ))}

      {/* ── 게이트 표시 ── */}
      {GATE_LABELS.map((gate) => {
        const angle = GATE_ANGLES[gate] ?? 0
        const outer = polarToXY(angle, R_OUTER - 8)
        const inner = polarToXY(angle, R_CONCOURSE + 2)
        const label = polarToXY(angle, R_OUTER + 10)
        return (
          <g key={gate}>
            {/* 게이트 통로 */}
            <line
              x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
              stroke="#FFFDF8" strokeWidth="8" strokeLinecap="round"
            />
            {/* 게이트 번호 */}
            <text
              x={label.x} y={label.y + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="#5E1530"
              fontFamily="sans-serif"
            >
              {gate}
            </text>
          </g>
        )
      })}

      {/* ── 중앙(홈베이스) 방향 나침반 ── */}
      <g transform="translate(278, 22)">
        <circle r="11" fill="rgba(255,255,255,0.85)" stroke="#C8A8B4" strokeWidth="1.5" />
        {/* N 화살표 */}
        <polygon points="0,-8 -3,4 0,2 3,4" fill="#430A21" />
        <text x="0" y="3" textAnchor="middle" fontSize="7" fontWeight="900" fill="#430A21" fontFamily="sans-serif">N</text>
      </g>

      {/* ── 층 라벨 ── */}
      <g transform="translate(22, 22)">
        <rect x="-14" y="-12" width="36" height="20" rx="6"
          fill="#430A21" />
        <text x="4" y="3" textAnchor="middle" fontSize="11" fontWeight="900"
          fill="#FFF8F9" fontFamily="sans-serif">{floor}</text>
      </g>

      {/* ── 매장 마커 ── */}
      {storePositions.map(({ store, pos }) => {
        const color = markerColor(store)
        const isSelected = store.id === selectedStoreId
        const r = isSelected ? 10 : 7
        return (
          <g
            key={store.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectStore(store)}
            role="button"
            aria-label={store.name}
          >
            {/* 선택 링 */}
            {isSelected && (
              <circle
                cx={pos.x} cy={pos.y} r={r + 4}
                fill="rgba(255,255,255,0.8)"
                stroke={color.stroke}
                strokeWidth="1.5"
              />
            )}
            {/* 마커 원 */}
            <circle
              cx={pos.x} cy={pos.y} r={r}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {/* 슬롯 번호 */}
            <text
              x={pos.x} y={pos.y + 3.5}
              textAnchor="middle"
              fontSize={store.slotNo.length > 3 ? "5" : "6"}
              fontWeight="900"
              fill={color.label}
              fontFamily="sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {store.slotNo}
            </text>
          </g>
        )
      })}

      {/* ── 선택된 매장 말풍선 ── */}
      {storePositions
        .filter(({ store }) => store.id === selectedStoreId)
        .map(({ store, pos }) => {
          const color = markerColor(store)
          // 말풍선이 화면 밖으로 나가지 않도록 위치 조정
          const bx = Math.min(Math.max(pos.x - 55, 4), 182)
          const by = pos.y > 180 ? pos.y - 68 : pos.y + 16
          return (
            <g key={`bubble-${store.id}`} style={{ pointerEvents: 'none' }}>
              <rect
                x={bx} y={by} width="114" height="46"
                rx="8"
                fill="#FFFDF8"
                stroke={color.stroke}
                strokeWidth="1.5"
                filter="url(#shadow)"
              />
              <text x={bx + 8} y={by + 16} fontSize="9" fontWeight="900"
                fill={color.stroke} fontFamily="sans-serif">
                {store.slotNo}
              </text>
              <text x={bx + 26} y={by + 16} fontSize="9" fontWeight="800"
                fill="#430A21" fontFamily="sans-serif">
                {store.name.length > 9 ? store.name.slice(0, 9) + '…' : store.name}
              </text>
              <text x={bx + 8} y={by + 30} fontSize="8" fill="#6F4B57"
                fontFamily="sans-serif">
                {store.nearestGate}
              </text>
              <text x={bx + 8} y={by + 42} fontSize="7.5" fill="#8C6B73"
                fontFamily="sans-serif">
                {store.businessHours}
              </text>
            </g>
          )
        })}

      {/* 그림자 필터 */}
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>
    </svg>
  )
}
