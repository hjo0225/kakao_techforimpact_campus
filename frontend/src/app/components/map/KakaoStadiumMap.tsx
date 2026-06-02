import { useEffect, useRef, useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { MapPin } from 'lucide-react'
import type { StadiumFloor, StadiumStore, StoreCategory } from '../../../lib/storesApi'

// ── 잠실야구장 중심 좌표 ──────────────────────────────────────────────────────
const STADIUM_LAT = 37.51175
const STADIUM_LNG = 127.07194
const MAPS_JS_KEY = import.meta.env.VITE_KAKAO_MAPS_JS_KEY as string | undefined

// ── 층별 매장 수동 위경도 테이블 ─────────────────────────────────────────────
// 카카오맵에서 직접 확인한 위도/경도를 입력하세요.
// 좌표가 없는 슬롯은 표시되지 않습니다.
// slotNo는 DB seed.ts 기준
const FLOOR_COORDS: Record<string, Record<string, { lat: number; lng: number }>> = {
  '1F': {
    // A구역 (3루 외야 콩코스)
    A01: { lat: 37.51180436343511, lng: 127.07285814543415 },  // 334블록
    A02: { lat: 37.51188091558847, lng: 127.07291194591838 },  // 333블록
    A03: { lat: 37.51198899934728, lng: 127.07297143259225 },  // 332블록
    A05: { lat: 37.51215567102622, lng: 127.07299421644437 },  // 330블록
    A06: { lat: 37.51222999507929, lng: 127.07300842733220 },  // 329블록
    A07: { lat: 37.51231108539573, lng: 127.07300850631911 },  // 328블록
    // B구역 (1루 내야 콩코스)
    A09: { lat: 37.51282803847350, lng: 127.07115967852667 },  // 307블록
    A10: { lat: 37.51276951070921, lng: 127.07109741308504 },  // 306블록
    A11: { lat: 37.51269747976127, lng: 127.07101534091106 },  // 305블록
    A12: { lat: 37.51261190482507, lng: 127.07098132724280 },  // 304블록
    // C구역 (외야)
    A16: { lat: 37.51155763877578, lng: 127.07113302334665 },
    A17: { lat: 37.51137277949238, lng: 127.07138733811240 },
    A20: { lat: 37.51135245047784, lng: 127.07148063179862 },
    A21: { lat: 37.51130280620294, lng: 127.07162762309984 },  // 10블록
  },
  '2F': {
    // 좌표를 순서대로 입력하세요. 입력된 슬롯만 마커로 표시됩니다.
    B01: { lat: 37.51174361888724, lng: 127.07273932370872 },
    B02: { lat: 37.51193953664056, lng: 127.07282151685517 },
    B03: { lat: 37.511957602014554, lng: 127.07274801444284 },
    B04: { lat: 37.512022926514454, lng: 127.0727452501519 },
    B05: { lat: 37.512140065682495, lng: 127.07273122535153 },
    B06: { lat: 37.51252511041413, lng: 127.07294933283524 },
    B07: { lat: 37.51253865689, lng: 127.07289844718872 },
    B08: { lat: 37.51265581699881, lng: 127.0728504899459 },
    B11: { lat: 37.51243742469348, lng: 127.07268627055385 },
    B12: { lat: 37.51249602644709, lng: 127.07262694544818 },
    B20: { lat: 37.51275796812005, lng: 127.07156114840221 },
    B21: { lat: 37.51273998743506, lng: 127.07149609366441 },
    B24: { lat: 37.51293143697527, lng: 127.0715188981103 },
    B26: { lat: 37.51313651615463, lng: 127.07135225741044 },
    B27: { lat: 37.51309151378552, lng: 127.07127303802432 },
    B28: { lat: 37.51303977258097, lng: 127.07116270728284 },
    B29: { lat: 37.512992519276835, lng: 127.07108065824804 },
    B30: { lat: 37.51288435118995, lng: 127.07115973199083 },
    B31: { lat: 37.51281907951449, lng: 127.07107483831759 },
    B32: { lat: 37.512724492861736, lng: 127.07104364370433 },
    B33: { lat: 37.51249248616034, lng: 127.07104059608406 },
    B34: { lat: 37.51244293946898, lng: 127.0710264105768 },
    B35: { lat: 37.512393411471294, lng: 127.0709811203248 },
    B36: { lat: 37.51216369462922, lng: 127.07091586570975 },
    B37: { lat: 37.51197990013291, lng: 127.07311563601309 },
    B38: { lat: 37.51200247420455, lng: 127.07303648264073 },
    B39: { lat: 37.5126962870993, lng: 127.07297212118921 },
    B40: { lat: 37.51278639792413, lng: 127.07295524258741 },
    B41: { lat: 37.51284272810063, lng: 127.07292702017446 },
  },
  '2.5F': {
    // 여기에 2.5층 슬롯 좌표를 입력하세요
    C01: { lat: 37.51287239662261, lng: 127.07229929399588 },
    C04: { lat: 37.51296037753021, lng: 127.07208164374985 },
    C05: { lat: 37.512611881028796, lng:  127.07102091523907},
  },
  '3F': {
    // 여기에 3층 슬롯 좌표를 입력하세요
    D02: { lat: 37.512414753201526, lng:  127.0729237760535},
    D04: { lat: 37.512644639830675, lng: 127.07271192095708 },
    D06: { lat: 37.51285655457454, lng: 127.07242087088237 },
    D07: { lat: 37.51294460479304, lng: 127.0720901117654 },
    D09: { lat: 37.51294945361972, lng: 127.07152457075868 },
    D11: { lat: 37.51283929931326, lng: 127.07116251694208 },
  },
  '4F': {
    // 여기에 4층 슬롯 좌표를 입력하세요
    F4_01: { lat: 37.51293770205987, lng: 127.07232763426995 },
    F4_02: { lat: 37.51298291986866, lng: 127.07205338813317 },
  },
}

// ── 카테고리 스타일 ──────────────────────────────────────────────────────────
const categoryStyles: Record<StoreCategory, { fill: string; stroke: string; soft: string }> = {
  MEAL:         { fill: '#C85C77', stroke: '#5E1530', soft: '#FFF0F3' },
  CAFE:         { fill: '#EFD49F', stroke: '#9C6A20', soft: '#FFF4D6' },
  CONVENIENCE:  { fill: '#BFE2C9', stroke: '#4F7E4D', soft: '#E8F5EB' },
  BEVERAGE:     { fill: '#BFD4F4', stroke: '#46639C', soft: '#E8F1FF' },
}

function getMarkerTone(store: StadiumStore) {
  return store.reusableContainer
    ? categoryStyles[store.category]
    : { fill: '#D1D5DB', stroke: '#6B7280', soft: '#F3F4F6' }
}

function getCategoryOverlayColor(store: StadiumStore): string {
  if (!store.reusableContainer) return '#6B7280'
  switch (store.category) {
    case 'MEAL':         return '#C85C77'
    case 'CAFE':         return '#9C6A20'
    case 'CONVENIENCE':  return '#4F7E4D'
    case 'BEVERAGE':     return '#46639C'
  }
}

// ── SDK 로드 ─────────────────────────────────────────────────────────────────
function loadKakaoMapsSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.load) { window.kakao.maps.load(() => resolve()); return }
    if (!MAPS_JS_KEY) { reject(new Error('no-key')); return }
    const existing = document.getElementById('kakao-maps-sdk')
    if (existing) {
      existing.addEventListener('load', () => window.kakao.maps.load(() => resolve()))
      return
    }
    const script = document.createElement('script')
    script.id = 'kakao-maps-sdk'
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${MAPS_JS_KEY}&autoload=false`
    script.onload = () => window.kakao.maps.load(() => resolve())
    script.onerror = () => reject(new Error('load-failed'))
    document.head.appendChild(script)
  })
}

// ── 층 선택기 ─────────────────────────────────────────────────────────────────
function FloorSelector({
  floors, selected, onSelect,
}: {
  floors: { code: StadiumFloor; label: string }[]
  selected: StadiumFloor | null
  onSelect: (floor: StadiumFloor) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[...floors].reverse().map((floor) => {
        const isActive = floor.code === selected
        return (
          <button
            key={floor.code}
            type="button"
            onClick={() => onSelect(floor.code)}
            aria-pressed={isActive}
            style={{
              minWidth: 46, padding: '8px 10px',
              border: `2px solid ${isActive ? '#430A21' : '#C8A8B4'}`,
              borderRadius: 10,
              background: isActive ? '#430A21' : 'rgba(255,255,255,0.92)',
              color: isActive ? '#FFF8F9' : '#430A21',
              fontSize: 13, fontWeight: 900, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            } as CSSProperties}
          >
            {floor.label}
          </button>
        )
      })}
    </div>
  )
}

// ── 매장 하단 카드 ─────────────────────────────────────────────────────────────
function StoreCard({ store, onClose }: { store: StadiumStore; onClose: () => void }) {
  const tone = getMarkerTone(store)
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
      background: '#fff', borderTop: '3px solid #430A21',
      borderRadius: '18px 18px 0 0',
      boxShadow: '0 -4px 20px rgba(67,10,33,0.2)',
      padding: '12px 16px 18px',
    }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D4B8C0', margin: '0 auto 10px' }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, flexShrink: 0,
          display: 'grid', placeItems: 'center', borderRadius: 10,
          background: tone.soft, border: `2px solid ${tone.stroke}`,
        }}>
          <MapPin size={16} color={tone.stroke} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{
              margin: 0, flex: 1, minWidth: 0, fontSize: 16, color: '#430A21',
              lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {store.name}
            </h3>
            <button
              type="button" onClick={onClose}
              style={{ flexShrink: 0, background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', fontSize: 13, color: '#8C6B73', fontWeight: 700 }}
            >닫기</button>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8C6B73', fontWeight: 700 }}>
            {store.nearestGate} · {store.zone} · Slot {store.slotNo}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5E1530', lineHeight: 1.4 }}>
            {store.featuredMenus.join(', ')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8C6B73' }}>
            {store.businessHours} · 다회용기 {store.reusableContainer ? '✓' : '✗'} / 개인용기 {store.personalCupAllowed ? '✓' : '✗'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
interface KakaoStadiumMapProps {
  floors: { code: StadiumFloor; label: string }[]
  selectedFloor: StadiumFloor | null
  stores: StadiumStore[]
  selectedStoreId: string | null
  onFloorSelect: (floor: StadiumFloor | null) => void
  onStoreSelect: (store: StadiumStore) => void
  onStoreCardClose: () => void
}

declare global {
  interface Window {
    __stadiumMarkerClick?: (storeId: string) => void
  }
}

export function KakaoStadiumMap({
  floors, selectedFloor, stores, selectedStoreId,
  onFloorSelect, onStoreSelect, onStoreCardClose,
}: KakaoStadiumMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const overlaysRef  = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState<'no-key' | 'failed' | null>(
    !MAPS_JS_KEY ? 'no-key' : null,
  )

  // ── 매장 CustomOverlay 관리 (모든 층) ─────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    if (!selectedFloor) return
    const floorCoords = FLOOR_COORDS[selectedFloor] ?? {}

    window.__stadiumMarkerClick = (storeId: string) => {
      const store = stores.find((s) => s.id === storeId)
      if (store) onStoreSelect(store)
    }

    stores.forEach((store) => {
      const coord = floorCoords[store.slotNo]
      if (!coord || coord.lat === 0) return

      const { lat, lng } = coord
      const pos = new window.kakao.maps.LatLng(lat, lng)
      const isSelected = store.id === selectedStoreId
      const bg = isSelected ? '#430A21' : getCategoryOverlayColor(store)

      // 선택된 마커: 가게명 풀 라벨 / 미선택: 슬롯번호만 작은 원
      const content = isSelected
        ? `<div
            onclick="window.__stadiumMarkerClick('${store.id}')"
            style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;"
          >
            <div style="
              background:${bg};color:#FFF8F9;border-radius:10px;padding:6px 10px;
              font-size:12px;font-weight:900;white-space:nowrap;
              box-shadow:0 4px 12px rgba(67,10,33,0.5);
              border:2px solid rgba(255,255,255,0.9);
              line-height:1.3;text-align:center;
            ">
              <div style="font-size:10px;opacity:0.8;">${store.slotNo}</div>
              <div>${store.name}</div>
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg};margin-top:-1px;"></div>
          </div>`
        : `<div
            onclick="window.__stadiumMarkerClick('${store.id}')"
            style="
              width:28px;height:28px;border-radius:50%;
              background:${bg};
              border:2px solid rgba(255,255,255,0.85);
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
              cursor:pointer;user-select:none;
              font-size:9px;font-weight:900;color:#FFF8F9;
              line-height:1;
            "
          >${store.slotNo}</div>`

      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos, content, yAnchor: 1.3, map: mapRef.current,
      })
      overlaysRef.current.push(overlay)
    })

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null))
      overlaysRef.current = []
      delete window.__stadiumMarkerClick
    }
  }, [mapReady, selectedFloor, stores, selectedStoreId, onStoreSelect])

  // ── 지도 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPS_JS_KEY || !containerRef.current) return
    loadKakaoMapsSdk()
      .then(() => {
        if (!containerRef.current) return
        const position = new window.kakao.maps.LatLng(STADIUM_LAT, STADIUM_LNG)
        const map = new window.kakao.maps.Map(containerRef.current, { center: position, level: 2 })
        mapRef.current = map
        new window.kakao.maps.Marker({ map, position })
        new window.kakao.maps.CustomOverlay({
          map, position,
          content: `<div style="background:#430A21;color:#FFF8F9;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.3);transform:translateY(-6px);">⚾ 잠실야구장</div>`,
          yAnchor: 1,
        })
        setMapReady(true)
      })
      .catch((err: Error) => setLoadError(err.message === 'no-key' ? 'no-key' : 'failed'))
  }, [])

  // ── 층 선택 핸들러 ────────────────────────────────────────────────────────
  const handleFloorSelect = useCallback((floor: StadiumFloor) => {
    if (mapRef.current) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(STADIUM_LAT, STADIUM_LNG))
      mapRef.current.setLevel(2)
    }
    onFloorSelect(selectedFloor === floor ? null : floor)
  }, [onFloorSelect, selectedFloor])

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 카카오 지도 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#E8E0D8' }} />

      {/* 로딩 / 에러 상태 */}
      {!mapReady && !loadError && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(244,238,232,0.85)', fontSize: 13, fontWeight: 700, color: '#5E1530' }}>
          지도를 불러오는 중…
        </div>
      )}
      {loadError === 'no-key' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#F4EEE8', padding: 24, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#8C6B73', fontWeight: 700, lineHeight: 1.7 }}>
            <code style={{ background: '#FFF0F3', padding: '1px 6px', borderRadius: 4, color: '#430A21' }}>VITE_KAKAO_MAPS_JS_KEY</code>를 설정해 주세요.
          </p>
        </div>
      )}
      {loadError === 'failed' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#F4EEE8', fontSize: 12, fontWeight: 700, color: '#8C6B73' }}>
          지도를 불러오지 못했습니다.
        </div>
      )}

      {/* 매장 하단 카드 */}
      {selectedFloor && selectedStore && (
        <StoreCard store={selectedStore} onClose={onStoreCardClose} />
      )}

      {/* 층 선택기 — 좌하단 (매장 카드가 열리면 카드 위로 올라옴) */}
      {floors.length > 0 && (
        <div style={{
          position: 'absolute',
          left: 12,
          bottom: selectedFloor && selectedStore ? 172 : 16,
          zIndex: 30,
          transition: 'bottom 0.2s ease',
        }}>
          <FloorSelector floors={floors} selected={selectedFloor} onSelect={handleFloorSelect} />
        </div>
      )}
    </div>
  )
}
