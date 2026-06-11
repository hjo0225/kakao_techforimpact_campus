import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Beer, Coffee, Search, Store, UtensilsCrossed, X } from 'lucide-react'
import { BottomNav } from '../BottomNav'
import { StatusBar } from '../StatusBar'
import { KakaoStadiumMap } from '../map/KakaoStadiumMap'
import {
  CATEGORY_LABELS,
  JAMSIL_FLOOR_FIXTURE,
  JAMSIL_STORE_FIXTURE,
  getStadiumFloors,
  getStadiumStores,
  type StadiumFloor,
  type StadiumStore,
  type StoreCategory,
} from '../../../lib/storesApi'

// ── 카테고리 목록 ─────────────────────────────────────────────────────────────
const categories: Array<{ key: 'ALL' | StoreCategory; label: string; icon: typeof Store }> = [
  { key: 'ALL',          label: '전체',                        icon: Store          },
  { key: 'MEAL',         label: CATEGORY_LABELS.MEAL,         icon: UtensilsCrossed },
  { key: 'CAFE',         label: CATEGORY_LABELS.CAFE,         icon: Coffee         },
  { key: 'CONVENIENCE',  label: CATEGORY_LABELS.CONVENIENCE,  icon: Store          },
  { key: 'BEVERAGE',     label: CATEGORY_LABELS.BEVERAGE,     icon: Beer           },
]

// ── 용기 필터 ─────────────────────────────────────────────────────────────────
type ContainerFilter = 'ALL' | 'REUSABLE' | 'PERSONAL'
const containerFilters: Array<{ key: ContainerFilter; label: string }> = [
  { key: 'ALL',      label: '용기 전체'      },
  { key: 'REUSABLE', label: '다회용기 가능'  },
  { key: 'PERSONAL', label: '개인용기 가능'  },
]

function normalizeSearch(v: string) { return v.trim().toLowerCase() }

function matchesSearch(store: StadiumStore, rawQuery: string) {
  const q = normalizeSearch(rawQuery)
  if (!q) return true
  return [store.name, store.slotNo, store.nearestGate, store.gate, ...store.featuredMenus]
    .some((t) => t.toLowerCase().includes(q))
}

function isCategoryMatch(store: StadiumStore, cat: 'ALL' | StoreCategory) {
  return cat === 'ALL' ? true : store.category === cat
}

function isContainerMatch(store: StadiumStore, filter: ContainerFilter) {
  if (filter === 'REUSABLE') return store.reusableContainer
  if (filter === 'PERSONAL') return store.personalCupAllowed
  return true
}

function getFoodOnly(cat: 'ALL' | StoreCategory) {
  return cat !== 'ALL' && cat !== 'CONVENIENCE'
}

// ── 전층 검색 결과 (fixture 기준) ─────────────────────────────────────────────
function searchAllFloors(query: string): StadiumStore[] {
  if (!normalizeSearch(query)) return []
  return JAMSIL_STORE_FIXTURE.filter((s) => matchesSearch(s, query)).slice(0, 20)
}

// ── MapScreen ─────────────────────────────────────────────────────────────────
export function MapScreen() {
  const [selectedFloor, setSelectedFloor] = useState<StadiumFloor | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | StoreCategory>('ALL')
  const [containerFilter, setContainerFilter] = useState<ContainerFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [pinnedStore, setPinnedStore] = useState<StadiumStore | null>(null)
  const [showStoreList, setShowStoreList] = useState(false)

  const foodOnly = getFoodOnly(selectedCategory)

  const floorsQuery = useQuery({
    queryKey: ['stadium-floors', 'JAMSIL'],
    queryFn: () => getStadiumFloors('JAMSIL'),
  })

  const storesQuery = useQuery({
    queryKey: ['stadium-stores', 'JAMSIL', selectedFloor, foodOnly],
    queryFn: () => getStadiumStores({
      stadiumCode: 'JAMSIL',
      floor: selectedFloor ?? '2F',
      foodOnly,
    }),
    enabled: selectedFloor !== null,
  })

  const floorOptions = floorsQuery.data?.data.floors ?? JAMSIL_FLOOR_FIXTURE
  const queriedStores = storesQuery.data?.data.items ?? []

  const visibleStores = useMemo(
    () => queriedStores
      .filter((s) => isCategoryMatch(s, selectedCategory))
      .filter((s) => isContainerMatch(s, containerFilter))
      .filter((s) => matchesSearch(s, searchQuery)),
    [queriedStores, searchQuery, selectedCategory, containerFilter],
  )

  // 층이 바뀌면 선택/핀 초기화 (층 버튼으로 직접 변경 시)
  useEffect(() => {
    setSelectedStoreId(null)
    setPinnedStore(null)
  }, [selectedFloor])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <StatusBar centerLabel="지도" />

      {/* ── 검색바 ── */}
      <div style={{ padding: '12px 12px 8px', background: '#fff', position: 'relative' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#FFFDF8', border: '2px solid #430A21',
          borderRadius: 12, boxShadow: '0 2px 0 0 #430A21',
          padding: '0 12px', minHeight: 42,
        }}>
          <Search size={15} color="#5E1530" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="전체 층 가게명, 메뉴, 게이트 검색"
            style={{
              flex: 1, minWidth: 0, border: 0, outline: 'none',
              background: 'transparent', color: '#430A21',
              fontSize: 13, fontWeight: 600, padding: '10px 0',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}
            >
              <X size={15} color="#8C6B73" />
            </button>
          )}
        </label>

        {/* 전층 검색 결과 드롭다운 */}
        {searchQuery && (() => {
          const results = searchAllFloors(searchQuery)
          if (!results.length) return (
            <div style={{
              position: 'absolute', top: '100%', left: 12, right: 12, zIndex: 50,
              background: '#fff', border: '2px solid #430A21', borderRadius: 12,
              boxShadow: '0 4px 16px rgba(67,10,33,0.18)',
              padding: '12px 14px', fontSize: 13, color: '#8C6B73', fontWeight: 700,
            }}>
              검색 결과가 없습니다.
            </div>
          )
          return (
            <div style={{
              position: 'absolute', top: '100%', left: 12, right: 12, zIndex: 50,
              background: '#fff', border: '2px solid #430A21', borderRadius: 12,
              boxShadow: '0 4px 16px rgba(67,10,33,0.18)',
              maxHeight: 280, overflowY: 'auto',
            }}>
              {results.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => {
                    setPinnedStore(store)
                    setSelectedFloor(store.floor)
                    setSelectedStoreId(store.id)
                    setSearchQuery('')
                  }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px',
                    background: 'none', border: 'none',
                    borderBottom: '1px solid #F0E4E8',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 900,
                    background: '#430A21', color: '#FFF8F9',
                    borderRadius: 6, padding: '2px 6px',
                  }}>
                    {store.floor}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#430A21' }}>{store.name}</span>
                    <span style={{ fontSize: 11, color: '#8C6B73', marginLeft: 6 }}>{store.slotNo} · {store.nearestGate}</span>
                  </span>
                </button>
              ))}
            </div>
          )
        })()}
      </div>

      {/* ── 카테고리 칩 — 스크롤 없이 한 화면에 모두 (균등 분배) ── */}
      <div style={{
        display: 'flex', gap: 5,
        padding: '8px 10px 4px',
        background: '#fff',
      }}>
        {categories.map((cat) => {
          const Icon = cat.icon
          const isActive = selectedCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.key)
                setShowStoreList(true)
              }}
              style={{
                flex: 1, minWidth: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                borderRadius: 999, padding: '6px 2px',
                border: '2px solid #430A21', cursor: 'pointer',
                fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                background: isActive ? '#430A21' : '#fff',
                color: isActive ? '#FFF8F9' : '#430A21',
                boxShadow: isActive ? '0 2px 0 0 #2F0415' : '0 2px 0 0 #430A21',
              }}
              aria-pressed={isActive}
            >
              <Icon size={12} style={{ flexShrink: 0 }} />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* ── 용기 필터 — 카테고리 칩과 동일 규격 ── */}
      <div style={{
        display: 'flex', gap: 5,
        padding: '4px 10px 8px',
        background: '#fff',
      }}>
        {containerFilters.map((f) => {
          const isActive = containerFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setContainerFilter(f.key)}
              aria-pressed={isActive}
              style={{
                width: 61, height: 31.7, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 999, padding: '0 4px',
                border: '2px solid #430A21', cursor: 'pointer',
                fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                background: isActive ? '#430A21' : '#fff',
                color: isActive ? '#FFF8F9' : '#430A21',
                boxShadow: isActive ? '0 2px 0 0 #2F0415' : '0 2px 0 0 #430A21',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* ── 지도 (나머지 전체) ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 잠실야구장 라벨 — SDK 로드 여부와 무관하게 항상 표시 */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none',
          background: 'rgba(255,253,248,0.95)', border: '2px solid #430A21',
          borderRadius: 999, padding: '5px 14px', boxShadow: '0 2px 0 0 #430A21',
          fontSize: 12, fontWeight: 900, color: '#430A21',
          display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}>
          ⚾ 잠실야구장
        </div>
        <KakaoStadiumMap
          floors={floorOptions}
          selectedFloor={selectedFloor}
          stores={pinnedStore ? [pinnedStore] : visibleStores}
          selectedStoreId={selectedStoreId}
          onFloorSelect={(floor) => {
            setSelectedFloor((prev) => prev === floor ? null : floor)
            setSelectedStoreId(null)
            setPinnedStore(null)
          }}
          onStoreSelect={(store) => setSelectedStoreId(store.id)}
          onStoreCardClose={() => {
            setSelectedStoreId(null)
            setPinnedStore(null)
          }}
        />
      </div>

      {/* ── 매장 목록 하단 시트 ── */}
      {showStoreList && (
        <div style={{
          background: '#fff',
          borderTop: '2px solid #EDD5DC',
          maxHeight: '40%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 16px rgba(67,10,33,0.12)',
        }}>
          {/* 시트 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px 8px',
            borderBottom: '1px solid #F0E4E8',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#430A21' }}>
              {selectedFloor ? `${selectedFloor} · ` : ''}
              {selectedCategory === 'ALL' ? '전체' : CATEGORY_LABELS[selectedCategory as StoreCategory]}
              {' '}매장 {visibleStores.length}곳
            </span>
            <button
              type="button"
              onClick={() => setShowStoreList(false)}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} color="#8C6B73" />
            </button>
          </div>

          {/* 매장 목록 */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {visibleStores.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#8C6B73', fontWeight: 700 }}>
                {selectedFloor ? '현재 층에 해당 매장이 없습니다.' : '층을 먼저 선택해 주세요.'}
              </div>
            ) : visibleStores.map((store) => {
              const isSelected = store.id === selectedStoreId
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => {
                    setSelectedStoreId(store.id)
                    setShowStoreList(false)
                  }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 16px',
                    background: isSelected ? '#FFF6F8' : 'none',
                    border: 'none',
                    borderBottom: '1px solid #F5EAED',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 900,
                    background: isSelected ? '#430A21' : '#EDD5DC',
                    color: isSelected ? '#FFF8F9' : '#430A21',
                    borderRadius: 6, padding: '2px 7px',
                  }}>
                    {store.slotNo}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 800, color: '#430A21',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {store.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#8C6B73', marginTop: 2 }}>
                      {store.nearestGate} · {store.zone}
                    </div>
                  </span>
                  <span style={{
                    flexShrink: 0, fontSize: 10, fontWeight: 700,
                    color: store.reusableContainer ? '#4F7E4D' : '#C8A8B4',
                  }}>
                    {store.reusableContainer ? '다회용기 ✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
