import { api } from './apiClient'

export type StadiumCode = 'JAMSIL'
export type StadiumFloor = '1F' | '2F' | '2.5F' | '3F' | '4F'
export type StoreCategory = 'MEAL' | 'CAFE' | 'CONVENIENCE' | 'BEVERAGE'

export interface StadiumFloorOption {
  code: StadiumFloor
  label: string
  order: number
}

export interface StadiumFloorsResponse {
  stadiumCode: StadiumCode
  stadiumName: string
  floors: StadiumFloorOption[]
}

export interface StadiumStore {
  id: string
  stadiumCode: StadiumCode
  floor: StadiumFloor
  name: string
  slotNo: string
  gate: string
  nearestGate: string
  zone: string
  category: StoreCategory
  marker: {
    xPct: number
    yPct: number
  }
  businessHours: string
  featuredMenus: string[]
  reusableContainer: boolean
  personalCupAllowed: boolean
  note?: string
}

export interface StadiumStoresResponse {
  stadiumCode: StadiumCode
  floor: StadiumFloor
  foodOnly: boolean
  items: StadiumStore[]
}

export interface ApiResourceResult<T> {
  data: T
  source: 'api' | 'fallback'
  errorMessage?: string
}

export interface GetStoresParams {
  stadiumCode?: StadiumCode
  floor: StadiumFloor
  foodOnly?: boolean
}

interface BackendFloorOption {
  code: string
  name: string
  sortOrder: number
}

interface BackendStoresResponse {
  stadium?: {
    code?: string
    name?: string
  }
  stores: Array<{
    assignmentId: string
    slot: {
      slotNo: string
      floorCode: string
      nearestGate?: {
        code: string
        name: string
      } | null
      areaLabel?: string | null
      map?: {
        xPct?: number | null
        yPct?: number | null
      } | null
    }
    tenant: {
      name: string
      category: string
      hoursText?: string | null
      publicNote?: string | null
      reusableContainerPolicy?: string | null
      personalContainerPolicy?: string | null
    }
    menus?: Array<{
      name: string
      priceText?: string | null
      usesReusableContainer?: boolean | null
      personalContainerAllowed?: boolean | null
    }>
  }>
}

export const CATEGORY_LABELS: Record<StoreCategory, string> = {
  MEAL: '식사',
  CAFE: '카페',
  CONVENIENCE: '편의점',
  BEVERAGE: '맥주/음료',
}

export const JAMSIL_FLOOR_FIXTURE: StadiumFloorOption[] = [
  { code: '1F', label: '1F', order: 1 },
  { code: '2F', label: '2F', order: 2 },
  { code: '2.5F', label: '2.5F', order: 3 },
  { code: '3F', label: '3F', order: 4 },
  { code: '4F', label: '4F', order: 5 },
]

const JAMSIL_FLOORS_FIXTURE: StadiumFloorsResponse = {
  stadiumCode: 'JAMSIL',
  stadiumName: '잠실야구장',
  floors: JAMSIL_FLOOR_FIXTURE,
}

type StoreFixtureRow = readonly [
  floor: StadiumFloor,
  slotNo: string,
  name: string,
  category: StoreCategory,
  xPct: number,
  yPct: number,
  nearestGate: string,
  zone: string,
]

interface StoreFixtureDetails {
  businessHours: string
  featuredMenus: string[]
  reusableContainer: boolean
  personalCupAllowed: boolean
  note?: string
}

const JAMSIL_STORE_FIXTURE_ROWS: StoreFixtureRow[] = [
  ['1F', 'A01', '까페희다', 'CAFE', 14.706, 34.649, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A02', 'BHC', 'MEAL', 14.706, 39.474, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A03', '잠실원샷 / Mr. Pizza', 'MEAL', 14.706, 44.298, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A04', 'GS25', 'CONVENIENCE', 14.706, 50.439, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A05', '한식 분식', 'MEAL', 14.706, 56.14, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A06', '맘스터치', 'MEAL', 14.706, 61.842, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A07', 'BBQ', 'MEAL', 14.706, 67.544, 'GATE 1-2', '3루 내야 외곽'],
  ['1F', 'A09', '도미노피자', 'MEAL', 85.588, 67.544, 'GATE 1-5', '1루 내야 외곽'],
  ['1F', 'A10', '광장 식당', 'MEAL', 85.588, 61.404, 'GATE 1-5', '1루 내야 외곽'],
  ['1F', 'A11', 'KFC', 'MEAL', 85.588, 55.263, 'GATE 1-5', '1루 내야 외곽'],
  ['1F', 'A12', '꼬꼬닭', 'MEAL', 85.588, 49.123, 'GATE 1-5', '1루 내야 외곽'],
  ['1F', 'A13', 'GS25', 'CONVENIENCE', 85.588, 42.982, 'GATE 1-5', '1루 내야 외곽'],
  ['1F', 'A16', 'GS25', 'CONVENIENCE', 72.059, 28.947, '1루 외야 출입구', '1루 외야'],
  ['1F', 'A17', '수내닭꼬치', 'MEAL', 83.529, 17.544, '1루 외야 출입구', '1루 외야 외곽'],
  ['1F', 'A19', '명인만두', 'MEAL', 60.588, 10.526, '1루 외야 출입구', '외야 중앙'],
  ['1F', 'A20', '맘스터치', 'MEAL', 56.765, 10.526, '1루 외야 출입구', '외야 중앙'],
  ['1F', 'A21', 'BBQ', 'MEAL', 52.941, 10.526, '3루 외야 출입구', '외야 중앙'],
  ['1F', 'A22', 'GS25', 'CONVENIENCE', 49.118, 10.526, '3루 외야 출입구', '외야 중앙'],
  ['1F', 'A26', 'GS25', 'CONVENIENCE', 33.824, 28.947, '3루 외야 출입구', '3루 외야'],
  ['1F', 'A28', '코카-콜라 팝업 스토어', 'BEVERAGE', 39.118, 8.772, '3루 외야 출입구', '외야 중앙 팝업'],
  ['2F', 'B01', 'BHC', 'MEAL', 30, 14.035, 'GATE 2-1', '3루 상단'],
  ['2F', 'B02', '까페 그라운드', 'CAFE', 27.059, 23.684, 'GATE 2-1', '3루 상단'],
  ['2F', 'B03', '피자헛', 'MEAL', 31.176, 25.439, 'GATE 2-1', '3루 상단'],
  ['2F', 'B04', '송사부 고로케', 'MEAL', 33.235, 28.947, 'GATE 2-1', '3루 상단'],
  ['2F', 'B05', '죠스 떡볶이', 'MEAL', 35.294, 33.333, 'GATE 2-1', '3루 상단'],
  ['2F', 'B06', '통밥', 'MEAL', 20.588, 54.825, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B07', '달곰', 'CAFE', 22.353, 59.649, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B08', '와팡', 'CAFE', 24.412, 64.035, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B11', 'KFC', 'MEAL', 37.941, 55.702, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B12', 'BBQ', 'MEAL', 39.412, 60.088, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B13', 'GS25', 'CONVENIENCE', 40.882, 64.474, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B19', 'GS25', 'CONVENIENCE', 62.059, 60.088, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B20', 'BBQ', 'MEAL', 63.824, 55.702, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B21', '맘스터치', 'MEAL', 66.471, 50.877, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B24', '꼬꼬닭 카페', 'CAFE', 74.706, 68.86, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B26', '갑도리 닭강정 / 초량본가어묵', 'MEAL', 79.412, 71.93, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B27', 'Miss&Mr Potato', 'MEAL', 82.647, 67.105, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B28', '잠실원샷', 'MEAL', 85.588, 63.158, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B29', '辛철판', 'MEAL', 88.824, 58.772, 'GATE 2-3', '1루 내야 2층'],
  ['2F', 'B30', '명인만두', 'MEAL', 87.059, 50.439, 'GATE 2-3', '1루 상단'],
  ['2F', 'B31', '백미당', 'CAFE', 83.235, 44.737, 'GATE 2-3', '1루 상단'],
  ['2F', 'B32', '맥주창고', 'BEVERAGE', 87.941, 36.842, 'GATE 2-3', '1루 상단'],
  ['2F', 'B33', '죠스 떡볶이', 'MEAL', 84.118, 25.439, 'GATE 2-3', '1루 상단'],
  ['2F', 'B34', '앤티앤스 프레즐', 'MEAL', 85.294, 21.93, 'GATE 2-3', '1루 상단'],
  ['2F', 'B35', '피자헛', 'MEAL', 86.471, 18.421, 'GATE 2-3', '1루 상단'],
  ['2F', 'B36', 'BHC', 'MEAL', 80, 14.035, 'GATE 2-3', '1루 상단'],
  ['2F', 'B37', '수내닭꼬치', 'MEAL', 16.176, 46.053, 'GATE 2-1', '3루 상단'],
  ['2F', 'B38', 'Mr. Pizza', 'MEAL', 13.235, 50, 'GATE 2-1', '3루 상단'],
  ['2F', 'B39', 'XOXO 핫도그', 'MEAL', 15.294, 69.298, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B40', '이가네 떡볶이', 'MEAL', 17.941, 73.684, 'GATE 2-2', '3루 내야 2층'],
  ['2F', 'B41', '辛철판', 'MEAL', 20.882, 78.07, 'GATE 2-2', '3루 내야 2층'],
  ['2.5F', 'C01', '짝태 패밀리', 'MEAL', 41.765, 76.316, 'GATE 1-1', '중앙 하단'],
  ['2.5F', 'C04', '와팡', 'CAFE', 64.412, 76.316, 'GATE 1-1', '중앙 하단'],
  ['2.5F', 'C05', '통밥', 'MEAL', 82.059, 42.105, 'GATE 1-5', '1루측 상단'],
  ['3F', 'D01', 'GS25', 'CONVENIENCE', 28.235, 38.596, 'GATE 2-1', '3루 상단'],
  ['3F', 'D02', '스태프 핫도그', 'MEAL', 24.118, 51.754, 'GATE 2-2', '3루 외곽'],
  ['3F', 'D03', 'GS25', 'CONVENIENCE', 31.765, 51.316, 'GATE 2-2', '3루 중앙'],
  ['3F', 'D04', 'KFC', 'MEAL', 38.235, 57.018, 'GATE 2-2', '3루 중앙'],
  ['3F', 'D05', 'GS25', 'CONVENIENCE', 44.412, 67.544, 'GATE 1-1', '중앙'],
  ['3F', 'D06', '와팡', 'CAFE', 49.118, 69.298, 'GATE 1-1', '중앙'],
  ['3F', 'D07', 'BBQ', 'MEAL', 57.059, 69.298, 'GATE 1-1', '중앙'],
  ['3F', 'D08', 'GS25', 'CONVENIENCE', 62.941, 67.544, 'GATE 1-1', '중앙'],
  ['3F', 'D09', '맘스터치', 'MEAL', 69.412, 57.018, 'GATE 2-3', '1루 중앙'],
  ['3F', 'D10', 'GS25', 'CONVENIENCE', 74.706, 51.316, 'GATE 2-3', '1루 중앙'],
  ['3F', 'D11', '스태프 핫도그', 'MEAL', 81.765, 51.754, 'GATE 2-3', '1루 외곽'],
  ['3F', 'D12', 'GS25', 'CONVENIENCE', 78.529, 38.596, 'GATE 2-3', '1루 상단'],
  ['4F', 'F4_01', '올떡', 'MEAL', 44.118, 68.421, 'GATE 1-1', '4층 중앙'],
  ['4F', 'F4_02', '열심히살겠습니다', 'MEAL', 57.647, 68.421, 'GATE 1-1', '4층 중앙'],
]

function normalizeFixtureName(name: string) {
  return name.normalize('NFKC').toLowerCase().replace(/[\s/&.-]+/g, '')
}

function getStoreFixtureDetails(name: string, category: StoreCategory): StoreFixtureDetails {
  const normalizedName = normalizeFixtureName(name)
  const defaultNote = '메뉴와 가격은 현장 운영에 따라 달라질 수 있는 참고용 목업 데이터입니다.'
  const drinkHours = '경기 시작 2시간 전부터 경기 종료 후 30분까지'
  const foodHours = '경기 시작 2시간 전부터 경기 종료까지'
  const beerHours = '경기 시작 2시간 전부터 8회말까지'
  const convenienceHours = '경기 시작 3시간 전부터 경기 종료 후 30분까지'

  if (normalizedName.includes('까페희다')) {
    return { businessHours: drinkHours, featuredMenus: ['아메리카노 4,500원', '크림라떼 5,800원', '버터쿠키 3,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('카페그라운드') || normalizedName.includes('까페그라운드') || normalizedName.includes('달곰')) {
    return { businessHours: drinkHours, featuredMenus: ['아이스 아메리카노 4,500원', '카페라떼 5,500원', '초코 머핀 4,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('와팡')) {
    return { businessHours: drinkHours, featuredMenus: ['와플 플레이트 6,500원', '아이스티 4,500원', '아메리카노 4,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('백미당')) {
    return { businessHours: drinkHours, featuredMenus: ['우유 아이스크림 4,800원', '밀크쉐이크 6,200원', '아메리카노 4,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('코카콜라')) {
    return { businessHours: beerHours, featuredMenus: ['코카-콜라 2,500원', '코카-콜라 제로 2,500원', '스프라이트 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('잠실원샷') && normalizedName.includes('pizza')) {
    return { businessHours: beerHours, featuredMenus: ['생맥주 500cc 5,500원', '페퍼로니 조각피자 6,500원', '나쵸 5,000원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('잠실원샷') || normalizedName.includes('맥주창고')) {
    return { businessHours: beerHours, featuredMenus: ['생맥주 500cc 5,500원', '레몬 하이볼 8,000원', '나쵸 5,000원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('bhc')) {
    return { businessHours: foodHours, featuredMenus: ['뿌링클 순살 23,000원', '치킨강정컵 8,000원', '생맥주 500cc 5,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('bbq')) {
    return { businessHours: foodHours, featuredMenus: ['황금올리브 치킨 24,000원', '닭강정컵 9,000원', '생맥주 500cc 5,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('kfc')) {
    return { businessHours: foodHours, featuredMenus: ['징거버거 세트 11,000원', '치킨텐더 6,500원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('맘스터치')) {
    return { businessHours: foodHours, featuredMenus: ['싸이버거 세트 9,500원', '케이준 양념감자 4,000원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('도미노') || normalizedName.includes('피자헛') || normalizedName.includes('mrpizza')) {
    return { businessHours: foodHours, featuredMenus: ['페퍼로니 조각피자 6,500원', '콤비네이션 피자 25,000원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('gs25')) {
    return { businessHours: convenienceHours, featuredMenus: ['생수 1,500원', '캔맥주 4,500원', '삼각김밥 1,800원'], reusableContainer: false, personalCupAllowed: false, note: '포장 상품 중심 매장입니다.' }
  }
  if (normalizedName.includes('죠스') || normalizedName.includes('이가네') || normalizedName.includes('올떡') || normalizedName.includes('한식분식')) {
    return { businessHours: foodHours, featuredMenus: ['떡볶이 6,000원', '순대 7,000원', '꼬치어묵 4,000원'], reusableContainer: true, personalCupAllowed: false, note: defaultNote }
  }
  if (normalizedName.includes('명인만두')) {
    return { businessHours: foodHours, featuredMenus: ['고기만두 6,000원', '김치만두 6,000원', '떡만두국 9,000원'], reusableContainer: true, personalCupAllowed: false, note: defaultNote }
  }
  if (normalizedName.includes('수내닭꼬치')) {
    return { businessHours: foodHours, featuredMenus: ['숯불 닭꼬치 5,000원', '소떡소떡 4,500원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('송사부')) {
    return { businessHours: foodHours, featuredMenus: ['야채 고로케 3,000원', '고기 고로케 3,500원', '아이스티 4,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('통밥')) {
    return { businessHours: foodHours, featuredMenus: ['스팸마요 컵밥 8,500원', '제육 컵밥 9,000원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('갑도리')) {
    return { businessHours: foodHours, featuredMenus: ['닭강정컵 9,000원', '부산 어묵탕 7,000원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('miss') || normalizedName.includes('potato')) {
    return { businessHours: foodHours, featuredMenus: ['감자튀김 5,000원', '치즈 프라이 6,500원', '레몬에이드 5,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('앤티앤스')) {
    return { businessHours: foodHours, featuredMenus: ['오리지널 프레즐 4,200원', '아몬드 크림치즈 스틱 5,500원', '레몬에이드 5,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('핫도그')) {
    return { businessHours: foodHours, featuredMenus: ['오리지널 핫도그 5,500원', '칠리치즈 핫도그 7,000원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('꼬꼬닭')) {
    return { businessHours: foodHours, featuredMenus: ['닭강정컵 9,000원', '치킨컵 7,500원', '아이스 아메리카노 4,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('辛철판') || normalizedName.includes('신철판')) {
    return { businessHours: foodHours, featuredMenus: ['철판 야끼소바 9,000원', '철판 볶음밥 9,000원', '콜라 2,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('광장식당')) {
    return { businessHours: foodHours, featuredMenus: ['제육덮밥 9,500원', '김치볶음밥 9,000원', '생수 1,500원'], reusableContainer: true, personalCupAllowed: false, note: defaultNote }
  }
  if (normalizedName.includes('짝태')) {
    return { businessHours: beerHours, featuredMenus: ['짝태구이 13,000원', '먹태구이 14,000원', '생맥주 500cc 5,500원'], reusableContainer: true, personalCupAllowed: true, note: defaultNote }
  }
  if (normalizedName.includes('열심히살겠습니다')) {
    return { businessHours: foodHours, featuredMenus: ['직화 불고기덮밥 10,000원', '냉모밀 8,500원', '생수 1,500원'], reusableContainer: true, personalCupAllowed: false, note: defaultNote }
  }

  return {
    businessHours: category === 'CONVENIENCE' ? convenienceHours : foodHours,
    featuredMenus: category === 'BEVERAGE' ? ['음료 2,500원', '생맥주 500cc 5,500원'] : ['대표 메뉴 현장 확인'],
    reusableContainer: category === 'CAFE' || category === 'BEVERAGE',
    personalCupAllowed: category === 'CAFE' || category === 'BEVERAGE',
    note: defaultNote,
  }
}

export const JAMSIL_STORE_FIXTURE: StadiumStore[] = JAMSIL_STORE_FIXTURE_ROWS.map(
  ([floor, slotNo, name, category, xPct, yPct, nearestGate, zone]) => {
    const details = getStoreFixtureDetails(name, category)
    return {
      id: `jamsil-${slotNo.toLowerCase()}`,
      stadiumCode: 'JAMSIL',
      floor,
      name,
      slotNo,
      gate: nearestGate,
      nearestGate,
      zone,
      category,
      marker: { xPct, yPct },
      ...details,
    }
  },
)

function isFloorResponse(value: unknown): value is StadiumFloorsResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StadiumFloorsResponse>
  return (
    candidate.stadiumCode === 'JAMSIL' &&
    Array.isArray(candidate.floors)
  )
}

function isBackendFloorResponse(value: unknown): value is BackendFloorOption[] {
  return Array.isArray(value) && value.every((floor) => (
    floor &&
    typeof floor === 'object' &&
    typeof (floor as Partial<BackendFloorOption>).code === 'string' &&
    typeof (floor as Partial<BackendFloorOption>).sortOrder === 'number'
  ))
}

function isStoresResponse(value: unknown): value is StadiumStoresResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StadiumStoresResponse>
  return (
    candidate.stadiumCode === 'JAMSIL' &&
    typeof candidate.floor === 'string' &&
    Array.isArray(candidate.items)
  )
}

function isBackendStoresResponse(value: unknown): value is BackendStoresResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BackendStoresResponse>
  return Array.isArray(candidate.stores)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown API error'
}

function isFoodCategory(category: StoreCategory) {
  return category !== 'CONVENIENCE'
}

function isStadiumFloor(value: string): value is StadiumFloor {
  return value === '1F' || value === '2F' || value === '2.5F' || value === '3F' || value === '4F'
}

function mapBackendCategory(category: string): StoreCategory {
  if (category === 'CONVENIENCE') return 'CONVENIENCE'
  if (category === 'CAFE' || category === 'DESSERT') return 'CAFE'
  if (category === 'BEER' || category === 'BEVERAGE' || category === 'POPUP') return 'BEVERAGE'
  return 'MEAL'
}

function isPositivePolicy(policy: string | null | undefined) {
  return policy === 'SUPPORTED' || policy === 'AVAILABLE' || policy === 'YES' || policy === 'TRUE'
}

function transformBackendFloors(stadiumCode: StadiumCode, floors: BackendFloorOption[]): StadiumFloorsResponse {
  return {
    stadiumCode,
    stadiumName: stadiumCode === 'JAMSIL' ? '잠실야구장' : stadiumCode,
    floors: floors
      .filter((floor) => isStadiumFloor(floor.code))
      .map((floor) => ({
        code: floor.code as StadiumFloor,
        label: floor.code,
        order: floor.sortOrder,
      })),
  }
}

function transformBackendStores(
  stadiumCode: StadiumCode,
  floor: StadiumFloor,
  foodOnly: boolean,
  data: BackendStoresResponse,
): StadiumStoresResponse {
  const items = data.stores
    .filter((store) => isStadiumFloor(store.slot.floorCode))
    .map<StadiumStore>((store) => {
      const category = mapBackendCategory(store.tenant.category)
      const menus = store.menus ?? []

      return {
        id: store.assignmentId,
        stadiumCode,
        floor: store.slot.floorCode as StadiumFloor,
        name: store.tenant.name,
        slotNo: store.slot.slotNo,
        gate: store.slot.nearestGate?.name ?? '가까운 게이트 확인',
        nearestGate: store.slot.nearestGate?.name ?? '가까운 게이트 확인',
        zone: store.slot.areaLabel ?? '구역 확인',
        category,
        marker: {
          xPct: store.slot.map?.xPct ?? 50,
          yPct: store.slot.map?.yPct ?? 50,
        },
        businessHours: store.tenant.hoursText ?? '경기일 운영, 상세 시간 현장 확인',
        featuredMenus: menus.length
          ? menus.slice(0, 3).map((menu) => menu.priceText ? `${menu.name} ${menu.priceText}` : menu.name)
          : ['대표 메뉴'],
        reusableContainer:
          isPositivePolicy(store.tenant.reusableContainerPolicy) ||
          menus.some((menu) => Boolean(menu.usesReusableContainer)),
        personalCupAllowed:
          isPositivePolicy(store.tenant.personalContainerPolicy) ||
          menus.some((menu) => Boolean(menu.personalContainerAllowed)),
        note: store.tenant.publicNote ?? undefined,
      }
    })
    .filter((store) => store.stadiumCode === stadiumCode && store.floor === floor)
    .filter((store) => !foodOnly || isFoodCategory(store.category))

  return {
    stadiumCode,
    floor,
    foodOnly,
    items,
  }
}

function getFallbackStores(stadiumCode: StadiumCode, floor: StadiumFloor, foodOnly: boolean) {
  return JAMSIL_STORE_FIXTURE.filter((store) => store.stadiumCode === stadiumCode && store.floor === floor)
    .filter((store) => !foodOnly || isFoodCategory(store.category))
}

export async function getStadiumFloors(
  stadiumCode: StadiumCode = 'JAMSIL',
): Promise<ApiResourceResult<StadiumFloorsResponse>> {
  try {
    const data = await api.get<StadiumFloorsResponse>(`/stadiums/${stadiumCode}/floors`)
    if (!isFloorResponse(data)) {
      if (isBackendFloorResponse(data)) {
        return { data: transformBackendFloors(stadiumCode, data), source: 'api' }
      }
      throw new Error('Invalid stadium floors response')
    }
    return { data, source: 'api' }
  } catch (error) {
    return {
      data: JAMSIL_FLOORS_FIXTURE,
      source: 'fallback',
      errorMessage: getErrorMessage(error),
    }
  }
}

export async function getStadiumStores({
  stadiumCode = 'JAMSIL',
  floor,
  foodOnly = false,
}: GetStoresParams): Promise<ApiResourceResult<StadiumStoresResponse>> {
  const query = new URLSearchParams({
    stadiumCode,
    floor,
    foodOnly: String(foodOnly),
  })

  try {
    const data = await api.get<StadiumStoresResponse | BackendStoresResponse>(`/stores?${query.toString()}`)
    if (!isStoresResponse(data)) {
      if (isBackendStoresResponse(data)) {
        return {
          data: transformBackendStores(stadiumCode, floor, foodOnly, data),
          source: 'api',
        }
      }
      throw new Error('Invalid stores response')
    }

    return {
      data: {
        ...data,
        items: data.items
          .filter((store) => store.stadiumCode === stadiumCode && store.floor === floor)
          .filter((store) => !foodOnly || isFoodCategory(store.category)),
      },
      source: 'api',
    }
  } catch (error) {
    return {
      data: {
        stadiumCode,
        floor,
        foodOnly,
        items: getFallbackStores(stadiumCode, floor, foodOnly),
      },
      source: 'fallback',
      errorMessage: getErrorMessage(error),
    }
  }
}
