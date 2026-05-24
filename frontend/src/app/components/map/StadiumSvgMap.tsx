import type { CSSProperties } from 'react'
import { MapPin } from 'lucide-react'
import type { StadiumFloor, StadiumStore, StoreCategory } from '../../../lib/storesApi'

interface StadiumSvgMapProps {
  floor: StadiumFloor
  stores: StadiumStore[]
  selectedStoreId: string | null
  onSelectStore: (store: StadiumStore) => void
}

interface FloorMapImage {
  src: string
  width: number
  height: number
  alt: string
}

const floorMapImages: Record<StadiumFloor, FloorMapImage> = {
  '1F': {
    src: '/maps/jamsil-1f.png',
    width: 1140,
    height: 932,
    alt: '잠실야구장 1층 식음료 지도',
  },
  '2F': {
    src: '/maps/jamsil-2f.png',
    width: 1290,
    height: 1048,
    alt: '잠실야구장 2층 식음료 지도',
  },
  '2.5F': {
    src: '/maps/jamsil-2_5f.png',
    width: 1475,
    height: 985,
    alt: '잠실야구장 2.5층 식음료 지도',
  },
  '3F': {
    src: '/maps/jamsil-3_4f.png',
    width: 1274,
    height: 803,
    alt: '잠실야구장 3층 식음료 지도',
  },
  '4F': {
    src: '/maps/jamsil-3_4f.png',
    width: 1274,
    height: 803,
    alt: '잠실야구장 4층 식음료 지도',
  },
}

const categoryStyles: Record<StoreCategory, { fill: string; stroke: string; text: string; soft: string }> = {
  MEAL: { fill: '#C85C77', stroke: '#5E1530', text: '#FFF8FB', soft: '#FFF0F3' },
  CAFE: { fill: '#EFD49F', stroke: '#9C6A20', text: '#5C3E08', soft: '#FFF4D6' },
  CONVENIENCE: { fill: '#BFE2C9', stroke: '#4F7E4D', text: '#2A472A', soft: '#E8F5EB' },
  BEVERAGE: { fill: '#BFD4F4', stroke: '#46639C', text: '#1F3D6B', soft: '#E8F1FF' },
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

function markerStyle(store: StadiumStore, isSelected: boolean): CSSProperties {
  const tone = categoryStyles[store.category]
  const markerSize = isSelected ? 'clamp(28px, 7vw, 38px)' : 'clamp(22px, 5.5vw, 30px)'
  const borderWidth = isSelected ? 3 : 2

  return {
    position: 'absolute',
    left: `${clamp(store.marker.xPct, 2, 98)}%`,
    top: `${clamp(store.marker.yPct, 2, 98)}%`,
    transform: 'translate(-50%, -82%)',
    width: markerSize,
    height: markerSize,
    borderRadius: 999,
    border: `${borderWidth}px solid ${tone.stroke}`,
    background: tone.fill,
    color: tone.text,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    fontSize: store.slotNo.length > 3 ? 8 : 10,
    fontWeight: 900,
    lineHeight: 1,
    boxShadow: isSelected
      ? '0 0 0 4px rgba(255,255,255,0.82), 0 7px 14px rgba(67, 10, 33, 0.22)'
      : '0 0 0 2px rgba(255,255,255,0.76), 0 4px 9px rgba(67, 10, 33, 0.16)',
    cursor: 'pointer',
    zIndex: isSelected ? 8 : 5,
    touchAction: 'manipulation',
  }
}

function labelPosition(store: StadiumStore): CSSProperties {
  return {
    position: 'absolute',
    left: `clamp(12px, calc(${store.marker.xPct}% - 110px), calc(100% - 232px))`,
    top: `clamp(12px, calc(${store.marker.yPct}% - 112px), calc(100% - 104px))`,
    width: '220px',
    zIndex: 9,
    pointerEvents: 'none',
  }
}

function StoreMarker({
  store,
  selected,
  onSelectStore,
}: {
  store: StadiumStore
  selected: boolean
  onSelectStore: (store: StadiumStore) => void
}) {
  const tone = categoryStyles[store.category]

  return (
    <button
      type="button"
      aria-label={`${store.name} 선택`}
      title={`${store.name} · ${store.slotNo}`}
      onClick={() => onSelectStore(store)}
      style={markerStyle(store, selected)}
    >
      <span>{store.slotNo}</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -8,
          width: 11,
          height: 11,
          transform: 'translateX(-50%) rotate(45deg)',
          background: tone.fill,
          borderRight: `${selected ? 3 : 2}px solid ${tone.stroke}`,
          borderBottom: `${selected ? 3 : 2}px solid ${tone.stroke}`,
          borderBottomRightRadius: 4,
        }}
      />
    </button>
  )
}

function SelectionLabel({ store }: { store: StadiumStore }) {
  const tone = categoryStyles[store.category]

  return (
    <div style={labelPosition(store)}>
      <div
        style={{
          border: `3px solid ${tone.stroke}`,
          borderRadius: 14,
          background: '#FFFDF8',
          boxShadow: '0 4px 0 0 rgba(67, 10, 33, 0.88), 0 8px 18px rgba(67, 10, 33, 0.2)',
          padding: '10px 12px',
          display: 'grid',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
          <span
            style={{
              flexShrink: 0,
              display: 'inline-grid',
              placeItems: 'center',
              minWidth: 42,
              height: 30,
              padding: '0 8px',
              borderRadius: 10,
              background: tone.soft,
              border: `2px solid ${tone.stroke}`,
              color: tone.stroke,
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            {store.slotNo}
          </span>
          <strong
            style={{
              minWidth: 0,
              color: '#430A21',
              fontSize: 16,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {store.name}
          </strong>
        </div>
        <p
          style={{
            margin: 0,
            color: '#6F4B57',
            fontSize: 13,
            lineHeight: 1.35,
            fontWeight: 800,
            wordBreak: 'keep-all',
          }}
        >
          {truncate(`${store.nearestGate} · ${store.zone}`, 32)}
        </p>
      </div>
    </div>
  )
}

export function StadiumSvgMap({
  floor,
  stores,
  selectedStoreId,
  onSelectStore,
}: StadiumSvgMapProps) {
  const mapImage = floorMapImages[floor]
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null

  return (
    <div
      style={{
        border: '3px solid #430A21',
        borderRadius: '18px',
        overflow: 'hidden',
        background: '#FFFDF8',
        boxShadow: '0 4px 0 0 #430A21, 0 6px 12px rgba(67, 10, 33, 0.18)',
        touchAction: 'pan-y',
      }}
    >
      <div
        aria-label={`${mapImage.alt} 위 매장 마커`}
        role="img"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${mapImage.width} / ${mapImage.height}`,
          overflow: 'hidden',
          background: '#F4EEE8',
          touchAction: 'pan-y',
        }}
      >
        <img
          src={mapImage.src}
          alt={mapImage.alt}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {stores.map((store) => (
          <StoreMarker
            key={store.id}
            store={store}
            selected={store.id === selectedStoreId}
            onSelectStore={onSelectStore}
          />
        ))}

        {selectedStore && <SelectionLabel store={selectedStore} />}

        {!stores.length && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: 24,
              color: '#430A21',
              background: 'rgba(255, 253, 248, 0.62)',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <MapPin size={24} style={{ marginBottom: 8 }} />
            현재 조건에 맞는 매장이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
