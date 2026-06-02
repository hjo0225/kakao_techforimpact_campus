import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Beer,
  Coffee,
  Info,
  MapPin,
  Search,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import { BottomNav } from '../BottomNav'
import { StatusBar } from '../StatusBar'
import { StadiumSvgMap } from '../map/StadiumSvgMap'
import {
  CATEGORY_LABELS,
  JAMSIL_FLOOR_FIXTURE,
  getStadiumFloors,
  getStadiumStores,
  type StadiumFloor,
  type StadiumStore,
  type StoreCategory,
} from '../../../lib/storesApi'

const floorButtonBaseStyle = {
  borderRadius: '9999px',
  padding: '10px 14px',
  border: '2px solid #430A21',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
} as const

const categories: Array<{ key: 'ALL' | StoreCategory; label: string; icon: typeof UtensilsCrossed }> = [
  { key: 'ALL', label: '전체', icon: Store },
  { key: 'MEAL', label: CATEGORY_LABELS.MEAL, icon: UtensilsCrossed },
  { key: 'CAFE', label: CATEGORY_LABELS.CAFE, icon: Coffee },
  { key: 'CONVENIENCE', label: CATEGORY_LABELS.CONVENIENCE, icon: Store },
  { key: 'BEVERAGE', label: CATEGORY_LABELS.BEVERAGE, icon: Beer },
]

type ContainerFilter = 'REUSABLE' | 'PERSONAL' | 'ALL'

const containerFilters: Array<{ key: ContainerFilter; label: string }> = [
  { key: 'REUSABLE', label: '다회용기 가능' },
  { key: 'PERSONAL', label: '개인용기 가능' },
  { key: 'ALL', label: '용기 전체' },
]

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

function matchesSearch(store: StadiumStore, rawQuery: string) {
  const query = normalizeSearch(rawQuery)
  if (!query) return true

  const searchTargets = [
    store.name,
    store.slotNo,
    store.nearestGate,
    store.gate,
    ...store.featuredMenus,
  ]

  return searchTargets.some((target) => target.toLowerCase().includes(query))
}

function isCategoryMatch(store: StadiumStore, category: 'ALL' | StoreCategory) {
  return category === 'ALL' ? true : store.category === category
}

function isContainerMatch(store: StadiumStore, filter: ContainerFilter) {
  if (filter === 'REUSABLE') return store.reusableContainer
  if (filter === 'PERSONAL') return store.personalCupAllowed
  return true
}

function getFoodOnly(category: 'ALL' | StoreCategory) {
  return category !== 'ALL' && category !== 'CONVENIENCE'
}

function getCategoryTone(category: StoreCategory) {
  switch (category) {
    case 'MEAL':
      return { background: 'var(--cb-primary-soft)', color: 'var(--cb-primary-deep)', border: 'var(--cb-primary-border)' }
    case 'CAFE':
      return { background: '#FFF4D6', color: '#8C5A00', border: '#E3B34B' }
    case 'CONVENIENCE':
      return { background: '#E8F5EB', color: '#2F6B3A', border: '#8AC39A' }
    case 'BEVERAGE':
      return { background: '#E8F1FF', color: '#1F4B8F', border: '#8FAFE8' }
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '74px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#8C6B73', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#430A21', lineHeight: 1.45, minWidth: 0, wordBreak: 'keep-all' }}>{value}</p>
    </div>
  )
}

export function MapScreen() {
  const [selectedFloor, setSelectedFloor] = useState<StadiumFloor>('2F')
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | StoreCategory>('ALL')
  const [containerFilter, setContainerFilter] = useState<ContainerFilter>('REUSABLE')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  const foodOnly = getFoodOnly(selectedCategory)

  const floorsQuery = useQuery({
    queryKey: ['stadium-floors', 'JAMSIL'],
    queryFn: () => getStadiumFloors('JAMSIL'),
  })

  const storesQuery = useQuery({
    queryKey: ['stadium-stores', 'JAMSIL', selectedFloor, foodOnly],
    queryFn: () => getStadiumStores({ stadiumCode: 'JAMSIL', floor: selectedFloor, foodOnly }),
  })

  const floorOptions = floorsQuery.data?.data.floors ?? JAMSIL_FLOOR_FIXTURE
  const queriedStores = storesQuery.data?.data.items ?? []

  useEffect(() => {
    if (!floorOptions.some((floor) => floor.code === selectedFloor)) {
      setSelectedFloor(floorOptions[0]?.code ?? '2F')
    }
  }, [floorOptions, selectedFloor])

  const visibleStores = useMemo(
    () => queriedStores
      .filter((store) => isCategoryMatch(store, selectedCategory))
      .filter((store) => isContainerMatch(store, containerFilter))
      .filter((store) => matchesSearch(store, searchQuery)),
    [containerFilter, queriedStores, searchQuery, selectedCategory],
  )

  useEffect(() => {
    if (!visibleStores.length) {
      setSelectedStoreId(null)
      return
    }

    if (!selectedStoreId || !visibleStores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(visibleStores[0].id)
    }
  }, [selectedStoreId, visibleStores])

  const selectedStore = useMemo(
    () => visibleStores.find((store) => store.id === selectedStoreId) ?? visibleStores[0] ?? null,
    [selectedStoreId, visibleStores],
  )

  const hasFallbackData = floorsQuery.data?.source === 'fallback' || storesQuery.data?.source === 'fallback'
  const isLoading = floorsQuery.isLoading || storesQuery.isLoading

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', position: 'relative' }}>
      <StatusBar centerLabel="지도" />

      <div
        style={{
          flex: '1 1 0',
          height: 0,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          padding: '10px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <section
          style={{
            background: '#fff',
            border: '3px solid #430A21',
            borderRadius: '18px',
            boxShadow: '0 4px 0 0 #430A21, 0 6px 12px rgba(67, 10, 33, 0.18)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '14px 14px 12px', background: 'linear-gradient(180deg, #FFF6F8 0%, #FFFFFF 100%)', borderBottom: '2px solid #430A21' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#8C6B73', letterSpacing: '0.04em' }}>잠실야구장 내부 식음료 지도</p>
                <h2 style={{ margin: '4px 0 0', fontSize: 20, lineHeight: 1.2, color: '#430A21' }}>
                  잠실야구장 {selectedFloor}
                </h2>
              </div>
            </div>
          </div>

          <div style={{ padding: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ background: 'var(--cb-bg-soft)', border: '2px solid #430A21', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 2px 0 0 #430A21' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#8C6B73' }}>현재 층 매장</p>
                <p style={{ margin: '5px 0 0', fontSize: 18, fontWeight: 900, color: '#430A21' }}>{visibleStores.length}곳</p>
              </div>
              <div style={{ background: 'var(--cb-primary-soft)', border: '2px solid var(--cb-primary-border)', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 2px 0 0 var(--cb-primary-border)' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--cb-primary-deep)' }}>데이터 소스</p>
                <p style={{ margin: '5px 0 0', fontSize: 18, fontWeight: 900, color: '#430A21' }}>{hasFallbackData ? 'Fixture' : 'API'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {floorOptions.map((floor) => {
                const isActive = floor.code === selectedFloor

                return (
                  <button
                    key={floor.code}
                    type="button"
                    onClick={() => setSelectedFloor(floor.code)}
                    style={{
                      ...floorButtonBaseStyle,
                      background: isActive ? 'var(--cb-primary-soft)' : '#fff',
                      color: isActive ? 'var(--cb-primary-deep)' : '#5E1530',
                      borderColor: isActive ? 'var(--cb-primary-border)' : '#430A21',
                      boxShadow: isActive ? '0 2px 0 0 var(--cb-primary-border)' : '0 2px 0 0 #430A21',
                    }}
                    aria-pressed={isActive}
                  >
                    {floor.label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {categories.map((category) => {
                const Icon = category.icon
                const isActive = selectedCategory === category.key

                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setSelectedCategory(category.key)}
                    style={{
                      ...floorButtonBaseStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isActive ? '#430A21' : '#fff',
                      color: isActive ? '#FFF8F9' : '#430A21',
                      boxShadow: isActive ? '0 2px 0 0 #2F0415' : '0 2px 0 0 #430A21',
                    }}
                    aria-pressed={isActive}
                  >
                    <Icon size={14} />
                    {category.label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {containerFilters.map((filter) => {
                const isActive = containerFilter === filter.key

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setContainerFilter(filter.key)}
                    style={{
                      ...floorButtonBaseStyle,
                      background: isActive ? '#430A21' : '#fff',
                      color: isActive ? '#FFF8F9' : '#430A21',
                      boxShadow: isActive ? '0 2px 0 0 #2F0415' : '0 2px 0 0 #430A21',
                    }}
                    aria-pressed={isActive}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#FFFDF8',
                border: '2px solid #430A21',
                borderRadius: '12px',
                boxShadow: '0 2px 0 0 #430A21',
                padding: '0 12px',
                minHeight: 46,
              }}
            >
              <Search size={16} color="#5E1530" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="가게명, 메뉴명, 매장번호, 가까운 게이트"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  outline: 'none',
                  background: 'transparent',
                  color: '#430A21',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '12px 0',
                }}
              />
            </label>

            {hasFallbackData && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FFF4D6', border: '2px solid #B07800', borderRadius: '12px', boxShadow: '0 2px 0 0 #B07800', padding: '10px 12px' }}>
                <Info size={16} color="#8C5A00" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: '#8C5A00' }}>
                  백엔드 응답이 없거나 형식이 맞지 않아 로컬 fixture로 표시 중입니다.
                </p>
              </div>
            )}

            <StadiumSvgMap
              floor={selectedFloor}
              stores={visibleStores}
              selectedStoreId={selectedStore?.id ?? null}
              onSelectStore={(store) => setSelectedStoreId(store.id)}
            />

            {isLoading && (
              <div style={{ background: 'var(--cb-bg-soft)', border: '2px solid #430A21', borderRadius: '12px', boxShadow: '0 2px 0 0 #430A21', padding: '12px 14px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#5E1530', fontWeight: 700 }}>잠실야구장 매장을 불러오는 중입니다.</p>
              </div>
            )}

            {selectedStore ? (
              <section style={{ background: '#fff', border: '3px solid #430A21', borderRadius: '16px', boxShadow: '0 3px 0 0 #430A21, 0 5px 10px rgba(67, 10, 33, 0.16)', padding: 14, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '12px',
                      background: getCategoryTone(selectedStore.category).background,
                      border: `2px solid ${getCategoryTone(selectedStore.category).border}`,
                    }}
                  >
                    <MapPin size={18} color={getCategoryTone(selectedStore.category).color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <h3
                        title={selectedStore.name}
                        style={{
                          margin: 0,
                          fontSize: 18,
                          lineHeight: 1.25,
                          color: '#430A21',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {selectedStore.name}
                      </h3>
                      <span
                        style={{
                          flexShrink: 0,
                          padding: '4px 8px',
                          borderRadius: '9999px',
                          background: getCategoryTone(selectedStore.category).background,
                          border: `1.5px solid ${getCategoryTone(selectedStore.category).border}`,
                          color: getCategoryTone(selectedStore.category).color,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {CATEGORY_LABELS[selectedStore.category]}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8C6B73', fontWeight: 700 }}>
                      Slot {selectedStore.slotNo} · {selectedStore.nearestGate}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <DetailRow label="층" value={selectedStore.floor} />
                  <DetailRow label="게이트" value={selectedStore.gate} />
                  <DetailRow label="구역" value={selectedStore.zone} />
                  <DetailRow label="영업시간" value={selectedStore.businessHours} />
                  <DetailRow label="대표 메뉴" value={selectedStore.featuredMenus.join(', ')} />
                  <DetailRow
                    label="용기 여부"
                    value={`다회용기 ${selectedStore.reusableContainer ? '가능' : '불가'} / 개인용기 ${selectedStore.personalCupAllowed ? '가능' : '불가'}`}
                  />
                  <DetailRow label="비고" value={selectedStore.note ?? '-'} />
                </div>
              </section>
            ) : (
              <div style={{ background: '#fff', border: '2px solid #430A21', borderRadius: '14px', boxShadow: '0 2px 0 0 #430A21', padding: '16px 14px' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#5E1530', fontWeight: 700 }}>
                  현재 필터에 맞는 매장이 없습니다. 층이나 카테고리를 바꿔 보세요.
                </p>
              </div>
            )}

            <section style={{ display: 'grid', gap: 8 }}>
              {visibleStores.map((store) => {
                const tone = getCategoryTone(store.category)
                const isActive = store.id === selectedStore?.id

                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setSelectedStoreId(store.id)}
                    style={{
                      textAlign: 'left',
                      background: isActive ? '#FFF6F8' : '#fff',
                      border: isActive ? '2px solid var(--cb-primary-border)' : '2px solid #430A21',
                      borderRadius: '14px',
                      boxShadow: isActive ? '0 2px 0 0 var(--cb-primary-border)' : '0 2px 0 0 #430A21',
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          marginTop: 1,
                          minWidth: 38,
                          height: 38,
                          borderRadius: '10px',
                          background: tone.background,
                          border: `2px solid ${tone.border}`,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Store size={16} color={tone.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                          <p
                            title={store.name}
                            style={{
                              margin: 0,
                              flex: 1,
                              minWidth: 0,
                              fontSize: 14,
                              fontWeight: 800,
                              color: '#430A21',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {store.name}
                          </p>
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: tone.color }}>{store.slotNo}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8C6B73', fontWeight: 700 }}>
                          {store.nearestGate} · {store.zone}
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#5E1530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          대표 메뉴: {store.featuredMenus.join(', ')}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </section>
          </div>
        </section>

      </div>

      <BottomNav />
    </div>
  )
}
