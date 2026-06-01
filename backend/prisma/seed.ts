import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const db = prisma as Record<string, any>

const KBO_TEAMS = [
  { code: 'LG', displayName: 'LG 트윈스', primaryColor: '#C3042F' },
  { code: 'DS', displayName: '두산 베어스', primaryColor: '#131230' },
  { code: 'SS', displayName: '삼성 라이온즈', primaryColor: '#074CA1' },
  { code: 'HH', displayName: '한화 이글스', primaryColor: '#FF6600' },
  { code: 'KT', displayName: 'KT 위즈', primaryColor: '#000000' },
  { code: 'NC', displayName: 'NC 다이노스', primaryColor: '#1D467E' },
  { code: 'OB', displayName: '롯데 자이언츠', primaryColor: '#002955' },
  { code: 'HB', displayName: '키움 히어로즈', primaryColor: '#820024' },
  { code: 'KIA', displayName: 'KIA 타이거즈', primaryColor: '#EA0029' },
  { code: 'SK', displayName: 'SSG 랜더스', primaryColor: '#CE0E2D' },
]

// 한글 단축명 → 백엔드 teams.code 매핑
const TEAM_NAME_TO_CODE: Record<string, string> = {
  LG: 'LG',
  두산: 'DS',
  삼성: 'SS',
  한화: 'HH',
  KT: 'KT',
  NC: 'NC',
  롯데: 'OB',
  키움: 'HB',
  KIA: 'KIA',
  SSG: 'SK',
}

// 2026 KBO 정규시즌 — 05.12 ~ 05.31 (사용자 제공, 2회 입력 합본)
// 두 포맷 혼재:
//   (간략) "MM.DD?  HH:MM  AwayvsHome  Venue  -"
//   (프리뷰) "MM.DD?  HH:MM  AwayvsHome  프리뷰  [Caster…]  Venue  -"
//   캐스터가 두 줄에 걸치는 경우 있음 — preprocess에서 합침.
//   날짜는 다음 라인까지 fill-down. 05.18(월) / 05.25(월) 휴식일.
const SCHEDULE_RAW = `
05.12(화)    18:30    삼성vsLG    프리뷰        SS-T        잠실    -
18:30    NCvs롯데    프리뷰        KN-T        사직    -
18:30    SSGvsKT    프리뷰        SPO-T        수원    -
18:30    두산vsKIA    프리뷰        SPO-2T        광주    -
18:30    한화vs키움    프리뷰        MS-T        고척    -
05.13(수)    18:30    삼성vsLG    프리뷰        SS-T        잠실    -
18:30    NCvs롯데    프리뷰        KN-T        사직    -
18:30    SSGvsKT    프리뷰        SPO-T        수원    -
18:30    두산vsKIA    프리뷰        SPO-2T        광주    -
18:30    한화vs키움    프리뷰        MS-T        고척    -
05.14(목)    18:30    삼성vsLG    프리뷰        SS-T        잠실    -
18:30    NCvs롯데    프리뷰        KN-T        사직    -
18:30    SSGvsKT    프리뷰        SPO-T        수원    -
18:30    두산vsKIA    프리뷰        SPO-2T        광주    -
18:30    한화vs키움    프리뷰        MS-T        고척    -
05.15(금)    18:30    롯데vs두산    프리뷰        MS-T        잠실    -
18:30    LGvsSSG    프리뷰        SPO-2T        문학    -
18:30    KIAvs삼성    프리뷰        K-2T        대구    -
18:30    키움vsNC    프리뷰        KN-T
SPO-T        창원    -
18:30    한화vsKT    프리뷰        SS-T        수원    -
05.16(토)    14:00    한화vsKT    프리뷰        S-T        수원    -
17:00    롯데vs두산    프리뷰        SS-T        잠실    -
17:00    LGvsSSG    프리뷰        MS-T        문학    -
17:00    KIAvs삼성    프리뷰        SPO-2T        대구    -
17:00    키움vsNC    프리뷰        KN-T
SPO-T        창원    -
05.17(일)    14:00    롯데vs두산    프리뷰        MS-T        잠실    -
14:00    LGvsSSG    프리뷰        M-T        문학    -
14:00    KIAvs삼성    프리뷰        SPO-2T        대구    -
14:00    키움vsNC    프리뷰        KN-T
SPO-T        창원    -
14:00    한화vsKT    프리뷰        SS-T        수원    -
05.19(화)    18:30    NCvs두산    프리뷰                잠실    -
18:30    LGvsKIA    프리뷰                광주    -
18:30    SSGvs키움    프리뷰                고척    -
18:30    롯데vs한화    프리뷰                대전    -
18:30    KTvs삼성    프리뷰                포항    -
05.20(수)    18:30    NCvs두산                    잠실    -
18:30    LGvsKIA                    광주    -
18:30    SSGvs키움                    고척    -
18:30    롯데vs한화                    대전    -
18:30    KTvs삼성                    포항    -
05.21(목)    18:30    NCvs두산                    잠실    -
18:30    LGvsKIA                    광주    -
18:30    SSGvs키움                    고척    -
18:30    롯데vs한화                    대전    -
18:30    KTvs삼성                    포항    -
05.22(금)    18:30    키움vsLG                    잠실    -
18:30    삼성vs롯데                    사직    -
18:30    NCvsKT                    수원    -
18:30    SSGvsKIA                    광주    -
18:30    두산vs한화                    대전    -
05.23(토)    14:00    키움vsLG                    잠실    -
17:00    삼성vs롯데                    사직    -
17:00    NCvsKT                    수원    -
17:00    SSGvsKIA                    광주    -
17:00    두산vs한화                    대전    -
05.24(일)    14:00    키움vsLG                    잠실    -
14:00    삼성vs롯데                    사직    -
14:00    NCvsKT                    수원    -
14:00    SSGvsKIA                    광주    -
14:00    두산vs한화                    대전    -
05.26(화)    18:30    KTvs두산                    잠실    -
18:30    삼성vsSSG                    문학    -
18:30    LGvs롯데                    사직    -
18:30    한화vsNC                    창원    -
18:30    KIAvs키움                    고척    -
05.27(수)    18:30    KTvs두산                    잠실    -
18:30    삼성vsSSG                    문학    -
18:30    LGvs롯데                    사직    -
18:30    한화vsNC                    창원    -
18:30    KIAvs키움                    고척    -
05.28(목)    18:30    KTvs두산                    잠실    -
18:30    삼성vsSSG                    문학    -
18:30    LGvs롯데                    사직    -
18:30    한화vsNC                    창원    -
18:30    KIAvs키움                    고척    -
05.29(금)    18:30    KIAvsLG                    잠실    -
18:30    두산vs삼성                    대구    -
18:30    롯데vsNC                    창원    -
18:30    KTvs키움                    고척    -
18:30    SSGvs한화                    대전    -
05.30(토)    17:00    KIAvsLG                    잠실    -
17:00    두산vs삼성                    대구    -
17:00    롯데vsNC                    창원    -
17:00    KTvs키움                    고척    -
17:00    SSGvs한화                    대전    -
05.31(일)    14:00    KIAvsLG                    잠실    -
14:00    두산vs삼성                    대구    -
14:00    롯데vsNC                    창원    -
14:00    KTvs키움                    고척    -
14:00    SSGvs한화                    대전    -
`

const SCHEDULE_YEAR = 2026
const TEAM_TOKEN = Object.keys(TEAM_NAME_TO_CODE).sort((a, b) => b.length - a.length) // 긴 토큰 우선
const MATCH_PATTERN = new RegExp(`^(${TEAM_TOKEN.join('|')})vs(${TEAM_TOKEN.join('|')})$`)

const VENUES = new Set([
  '잠실', '광주', '고척', '대전', '포항', '사직', '수원', '문학', '창원', '대구',
])

const STADIUM_CODE = 'JAMSIL'
const STADIUM_FOOD_MAP_SEASON_YEAR = 2026
const STADIUM_FOOD_MAP_SOURCE_VERSION = '2026-ref-structure-ocr-v2'
const DEFAULT_HOURS_TEXT = '경기일 운영, 상세 시간 현장 확인'
const DEFAULT_PRICE_TEXT = '현장 확인'
const DEFAULT_VERIFICATION_STATUS = 'NEEDS_REVIEW'
const DEFAULT_SOURCE_CONFIDENCE = 'MEDIUM'
const DEFAULT_CONTAINER_POLICY = 'UNKNOWN'
const DEFAULT_ASSIGNMENT_STATUS = 'ACTIVE'
const DEFAULT_MENU_SALE_STATUS = 'ON_SALE'
const DEFAULT_RULE_TYPE = 'GAME_DAY'

type SeedRow = Record<string, unknown>

// 다회용기/개인용기 정책 오버라이드 (지정 안 하면 UNKNOWN). 대표 메뉴 offering에도 반영.
interface ContainerSeed {
  reusablePolicy?: string // ContainerPolicy enum: SUPPORTED | NOT_SUPPORTED | MENU_DEPENDENT | UNKNOWN
  personalPolicy?: string
  usesReusableContainer?: boolean
  personalContainerAllowed?: boolean
  reusableContainerRequired?: boolean
  depositKrw?: number
  personalDiscountKrw?: number
  containerType?: string
}

interface SlotSeedInput {
  floorCode: string
  slotNo: string
  name: string
  tenantCategory: string
  slotKind: string
  nearestGateCode: string
  side: string
  areaLabel: string
  xPct: number
  yPct: number
  isFoodMapVisible: boolean
  isTenantable?: boolean
  officialSlotNo?: string | null
  isCodeProvisional?: boolean
  sourceConfidence?: string
  verificationStatus?: string
  accessNote?: string
  landmarkNote?: string
  publicNote?: string
  badgeLabel?: string
  placeholderMenuName?: string
  container?: ContainerSeed
}

interface SlotGroupSeed {
  floorCode: string
  nearestGateCode: string
  side: string
  areaLabel: string
  xRange: [number, number]
  yRange: [number, number]
  entries: Array<{
    slotNo: string
    name: string
    tenantCategory: string
    slotKind: string
    isFoodMapVisible: boolean
    isTenantable?: boolean
    officialSlotNo?: string | null
    isCodeProvisional?: boolean
    sourceConfidence?: string
    verificationStatus?: string
    accessNote?: string
    landmarkNote?: string
    publicNote?: string
    badgeLabel?: string
    placeholderMenuName?: string
    xPct?: number
    yPct?: number
    nearestGateCode?: string
    side?: string
    areaLabel?: string
    container?: ContainerSeed
  }>
}

const STADIUM_FOOD_MAP_MODELS = [
  'stadium',
  'stadiumFloor',
  'stadiumGate',
  'storeSlot',
  'tenantStore',
  'storeAssignment',
  'tenantMenuItem',
  'storeMenuOffering',
  'storeOperatingRule',
] as const

const FLOOR_SOURCE_REFS: Record<string, string> = {
  '1F': 'ref/1층 구조도.png',
  '2F': 'ref/2층 구조도.png',
  '2.5F': 'ref/2.5층 구조도.png',
  '3F': 'ref/3:4층 구조도.png',
  '4F': 'ref/3:4층 구조도.png',
}

const FLOOR_MAP_IMAGES: Record<string, { mapImageUrl: string; mapWidth: number; mapHeight: number }> = {
  '1F': { mapImageUrl: '/maps/jamsil-1f.png', mapWidth: 1140, mapHeight: 932 },
  '2F': { mapImageUrl: '/maps/jamsil-2f.png', mapWidth: 1290, mapHeight: 1048 },
  '2.5F': { mapImageUrl: '/maps/jamsil-2_5f.png', mapWidth: 1475, mapHeight: 985 },
  '3F': { mapImageUrl: '/maps/jamsil-3_4f.png', mapWidth: 1274, mapHeight: 803 },
  '4F': { mapImageUrl: '/maps/jamsil-3_4f.png', mapWidth: 1274, mapHeight: 803 },
}

const STADIUM_FLOORS = [
  { id: `${STADIUM_CODE}-1F`, stadiumCode: STADIUM_CODE, code: '1F', name: '1층', sortOrder: 10, isPublic: true, sourceRef: FLOOR_SOURCE_REFS['1F'], ...FLOOR_MAP_IMAGES['1F'] },
  { id: `${STADIUM_CODE}-2F`, stadiumCode: STADIUM_CODE, code: '2F', name: '2층', sortOrder: 20, isPublic: true, sourceRef: FLOOR_SOURCE_REFS['2F'], ...FLOOR_MAP_IMAGES['2F'] },
  { id: `${STADIUM_CODE}-2.5F`, stadiumCode: STADIUM_CODE, code: '2.5F', name: '2.5층', sortOrder: 25, isPublic: true, sourceRef: FLOOR_SOURCE_REFS['2.5F'], ...FLOOR_MAP_IMAGES['2.5F'] },
  { id: `${STADIUM_CODE}-3F`, stadiumCode: STADIUM_CODE, code: '3F', name: '3층', sortOrder: 30, isPublic: true, sourceRef: FLOOR_SOURCE_REFS['3F'], ...FLOOR_MAP_IMAGES['3F'] },
  {
    id: `${STADIUM_CODE}-4F`,
    stadiumCode: STADIUM_CODE,
    code: '4F',
    name: '4층',
    sortOrder: 40,
    isPublic: true,
    sourceRef: FLOOR_SOURCE_REFS['4F'],
    ...FLOOR_MAP_IMAGES['4F'],
    note: '4층 매장 코드는 공식 슬롯 번호 확인 전까지 임시 코드로 유지합니다.',
  },
]

const STADIUM_GATES = [
  { id: `${STADIUM_CODE}-GATE_1_1`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'GATE_1_1', name: 'GATE 1-1', gateType: 'MAIN', xPct: 50, yPct: 84 },
  { id: `${STADIUM_CODE}-GATE_1_2`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'GATE_1_2', name: 'GATE 1-2', gateType: 'MAIN', xPct: 18, yPct: 79 },
  { id: `${STADIUM_CODE}-GATE_1_5`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'GATE_1_5', name: 'GATE 1-5', gateType: 'MAIN', xPct: 82, yPct: 79 },
  { id: `${STADIUM_CODE}-FIRST_BASE_INFIELD`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'FIRST_BASE_INFIELD', name: '1루 내야 출입구', gateType: 'INNER', xPct: 73, yPct: 52 },
  { id: `${STADIUM_CODE}-THIRD_BASE_INFIELD`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'THIRD_BASE_INFIELD', name: '3루 내야 출입구', gateType: 'INNER', xPct: 27, yPct: 52 },
  { id: `${STADIUM_CODE}-FIRST_BASE_OUTFIELD`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'FIRST_BASE_OUTFIELD', name: '1루 외야 출입구', gateType: 'OUTFIELD', xPct: 90, yPct: 66 },
  { id: `${STADIUM_CODE}-THIRD_BASE_OUTFIELD`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'THIRD_BASE_OUTFIELD', name: '3루 외야 출입구', gateType: 'OUTFIELD', xPct: 10, yPct: 66 },
  { id: `${STADIUM_CODE}-ENTRY_5`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'ENTRY_5', name: '출입구5', gateType: 'INNER', xPct: 40, yPct: 83 },
  { id: `${STADIUM_CODE}-ENTRY_6`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-1F`, code: 'ENTRY_6', name: '출입구6', gateType: 'INNER', xPct: 60, yPct: 83 },
  { id: `${STADIUM_CODE}-GATE_2_1`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-2F`, code: 'GATE_2_1', name: 'GATE 2-1', gateType: 'MAIN', xPct: 22, yPct: 80 },
  { id: `${STADIUM_CODE}-GATE_2_2`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-2F`, code: 'GATE_2_2', name: 'GATE 2-2', gateType: 'MAIN', xPct: 50, yPct: 82 },
  { id: `${STADIUM_CODE}-GATE_2_3`, stadiumCode: STADIUM_CODE, floorId: `${STADIUM_CODE}-2F`, code: 'GATE_2_3', name: 'GATE 2-3', gateType: 'MAIN', xPct: 78, yPct: 80 },
]

interface SlotCoordinateSeed {
  xPct: number
  yPct: number
  nearestGateCode?: string
  side?: string
  areaLabel?: string
  sourceConfidence?: string
}

// OCR-assisted fixed slot label coordinates from ref/*구조도.png, normalized to the map image coordinate system.
const OCR_SLOT_COORDINATES: Record<string, SlotCoordinateSeed> = {
  A01: { xPct: 14.706, yPct: 34.649, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A02: { xPct: 14.706, yPct: 39.474, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A03: { xPct: 14.706, yPct: 44.298, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A04: { xPct: 14.706, yPct: 50.439, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A05: { xPct: 14.706, yPct: 56.14, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A06: { xPct: 14.706, yPct: 61.842, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A07: { xPct: 14.706, yPct: 67.544, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '3루 내야 외곽', sourceConfidence: 'HIGH' },
  A09: { xPct: 85.588, yPct: 67.544, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '1루 내야 외곽', sourceConfidence: 'HIGH' },
  A10: { xPct: 85.588, yPct: 61.404, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '1루 내야 외곽', sourceConfidence: 'HIGH' },
  A11: { xPct: 85.588, yPct: 55.263, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '1루 내야 외곽', sourceConfidence: 'HIGH' },
  A12: { xPct: 85.588, yPct: 49.123, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '1루 내야 외곽', sourceConfidence: 'HIGH' },
  A13: { xPct: 85.588, yPct: 42.982, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '1루 내야 외곽', sourceConfidence: 'HIGH' },
  A14: { xPct: 90.882, yPct: 36.842, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '제2매표소', sourceConfidence: 'HIGH' },
  A15: { xPct: 88.529, yPct: 26.754, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '제3매표소', sourceConfidence: 'HIGH' },
  A16: { xPct: 72.059, yPct: 28.947, nearestGateCode: 'FIRST_BASE_OUTFIELD', side: 'FIRST_BASE', areaLabel: '1루 외야', sourceConfidence: 'HIGH' },
  A17: { xPct: 83.529, yPct: 17.544, nearestGateCode: 'FIRST_BASE_OUTFIELD', side: 'FIRST_BASE', areaLabel: '1루 외야 외곽', sourceConfidence: 'HIGH' },
  A18: { xPct: 72.647, yPct: 13.596, nearestGateCode: 'FIRST_BASE_OUTFIELD', side: 'FIRST_BASE', areaLabel: '제1매표소/무인발권기', sourceConfidence: 'HIGH' },
  A19: { xPct: 60.588, yPct: 10.526, nearestGateCode: 'FIRST_BASE_OUTFIELD', side: 'OUTFIELD', areaLabel: '외야 중앙', sourceConfidence: 'HIGH' },
  A20: { xPct: 56.765, yPct: 10.526, nearestGateCode: 'FIRST_BASE_OUTFIELD', side: 'OUTFIELD', areaLabel: '외야 중앙', sourceConfidence: 'HIGH' },
  A21: { xPct: 52.941, yPct: 10.526, nearestGateCode: 'THIRD_BASE_OUTFIELD', side: 'OUTFIELD', areaLabel: '외야 중앙', sourceConfidence: 'HIGH' },
  A22: { xPct: 49.118, yPct: 10.526, nearestGateCode: 'THIRD_BASE_OUTFIELD', side: 'OUTFIELD', areaLabel: '외야 중앙', sourceConfidence: 'HIGH' },
  A23: { xPct: 45.294, yPct: 10.526, nearestGateCode: 'THIRD_BASE_OUTFIELD', side: 'OUTFIELD', areaLabel: '외야 중앙', sourceConfidence: 'HIGH' },
  A25: { xPct: 34.706, yPct: 13.596, nearestGateCode: 'THIRD_BASE_OUTFIELD', side: 'THIRD_BASE', areaLabel: '무인발권기', sourceConfidence: 'HIGH' },
  A26: { xPct: 33.824, yPct: 28.947, nearestGateCode: 'THIRD_BASE_OUTFIELD', side: 'THIRD_BASE', areaLabel: '3루 외야', sourceConfidence: 'HIGH' },
  A27: { xPct: 24.118, yPct: 26.754, nearestGateCode: 'GATE_1_2', side: 'THIRD_BASE', areaLabel: '중앙매표소', sourceConfidence: 'HIGH' },
  A28: { xPct: 39.118, yPct: 8.772, nearestGateCode: 'THIRD_BASE_OUTFIELD', side: 'OUTFIELD', areaLabel: '외야 중앙 팝업', sourceConfidence: 'HIGH' },
  B01: { xPct: 30.0, yPct: 14.035, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B02: { xPct: 27.059, yPct: 23.684, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B03: { xPct: 31.176, yPct: 25.439, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B04: { xPct: 33.235, yPct: 28.947, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B05: { xPct: 35.294, yPct: 33.333, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B06: { xPct: 20.588, yPct: 54.825, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B07: { xPct: 22.353, yPct: 59.649, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B08: { xPct: 24.412, yPct: 64.035, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B09: { xPct: 33.529, yPct: 55.702, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B10: { xPct: 36.471, yPct: 50.877, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B11: { xPct: 37.941, yPct: 55.702, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B12: { xPct: 39.412, yPct: 60.088, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B13: { xPct: 40.882, yPct: 64.474, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B14: { xPct: 42.647, yPct: 68.86, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B17: { xPct: 57.647, yPct: 68.86, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B18: { xPct: 60.294, yPct: 64.474, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B19: { xPct: 62.059, yPct: 60.088, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B20: { xPct: 63.824, yPct: 55.702, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B21: { xPct: 66.471, yPct: 50.877, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B22: { xPct: 68.235, yPct: 46.491, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B23: { xPct: 74.118, yPct: 55.263, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B24: { xPct: 74.706, yPct: 68.86, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B25: { xPct: 78.529, yPct: 76.754, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B26: { xPct: 79.412, yPct: 71.93, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B27: { xPct: 82.647, yPct: 67.105, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B28: { xPct: 85.588, yPct: 63.158, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B29: { xPct: 88.824, yPct: 58.772, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 내야 2층', sourceConfidence: 'HIGH' },
  B30: { xPct: 87.059, yPct: 50.439, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B31: { xPct: 83.235, yPct: 44.737, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B32: { xPct: 87.941, yPct: 36.842, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B33: { xPct: 84.118, yPct: 25.439, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B34: { xPct: 85.294, yPct: 21.93, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B35: { xPct: 86.471, yPct: 18.421, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B36: { xPct: 80.0, yPct: 14.035, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  B37: { xPct: 16.176, yPct: 46.053, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B38: { xPct: 13.235, yPct: 50.0, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  B39: { xPct: 15.294, yPct: 69.298, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B40: { xPct: 17.941, yPct: 73.684, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  B41: { xPct: 20.882, yPct: 78.07, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 내야 2층', sourceConfidence: 'HIGH' },
  C01: { xPct: 41.765, yPct: 76.316, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '중앙 하단', sourceConfidence: 'HIGH' },
  C02: { xPct: 48.824, yPct: 76.316, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '놀이방', sourceConfidence: 'HIGH' },
  C03: { xPct: 57.059, yPct: 76.316, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '수유실', sourceConfidence: 'HIGH' },
  C04: { xPct: 64.412, yPct: 76.316, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '중앙 하단', sourceConfidence: 'HIGH' },
  C05: { xPct: 82.059, yPct: 42.105, nearestGateCode: 'GATE_1_5', side: 'FIRST_BASE', areaLabel: '1루측 상단', sourceConfidence: 'HIGH' },
  D01: { xPct: 28.235, yPct: 38.596, nearestGateCode: 'GATE_2_1', side: 'THIRD_BASE', areaLabel: '3루 상단', sourceConfidence: 'HIGH' },
  D02: { xPct: 24.118, yPct: 51.754, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 외곽', sourceConfidence: 'HIGH' },
  D03: { xPct: 31.765, yPct: 51.316, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 중앙', sourceConfidence: 'HIGH' },
  D04: { xPct: 38.235, yPct: 57.018, nearestGateCode: 'GATE_2_2', side: 'THIRD_BASE', areaLabel: '3루 중앙', sourceConfidence: 'HIGH' },
  D05: { xPct: 44.412, yPct: 67.544, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '중앙', sourceConfidence: 'HIGH' },
  D06: { xPct: 49.118, yPct: 69.298, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '중앙', sourceConfidence: 'HIGH' },
  D07: { xPct: 57.059, yPct: 69.298, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '중앙', sourceConfidence: 'HIGH' },
  D08: { xPct: 62.941, yPct: 67.544, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '중앙', sourceConfidence: 'HIGH' },
  D09: { xPct: 69.412, yPct: 57.018, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 중앙', sourceConfidence: 'HIGH' },
  D10: { xPct: 74.706, yPct: 51.316, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 중앙', sourceConfidence: 'HIGH' },
  D11: { xPct: 81.765, yPct: 51.754, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 외곽', sourceConfidence: 'HIGH' },
  D12: { xPct: 78.529, yPct: 38.596, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '1루 상단', sourceConfidence: 'HIGH' },
  F4_01: { xPct: 44.118, yPct: 68.421, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '4층 중앙', sourceConfidence: 'LOW' },
  F4_02: { xPct: 57.647, yPct: 68.421, nearestGateCode: 'GATE_1_1', side: 'CENTER', areaLabel: '4층 중앙', sourceConfidence: 'LOW' },
}

const SLOT_GROUPS: SlotGroupSeed[] = [
  {
    floorCode: '1F',
    nearestGateCode: 'GATE_1_2',
    side: 'THIRD_BASE',
    areaLabel: '1층 3루 외야 복도',
    xRange: [12, 36],
    yRange: [68, 48],
    entries: [
      { slotNo: 'A01', name: '까페희다', tenantCategory: 'CAFE', slotKind: 'CAFE', isFoodMapVisible: true },
      { slotNo: 'A02', name: 'BHC', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A03', name: '잠실원샷 / Mr. Pizza', tenantCategory: 'PIZZA', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A04', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'A05', name: '한식 분식', tenantCategory: 'KOREAN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A06', name: '맘스터치', tenantCategory: 'BURGER', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A07', name: 'BBQ', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true, nearestGateCode: 'THIRD_BASE_INFIELD', areaLabel: '1층 3루 내야 복도' },
    ],
  },
  {
    floorCode: '1F',
    nearestGateCode: 'GATE_1_1',
    side: 'CENTER',
    areaLabel: '1층 중앙 복도',
    xRange: [42, 62],
    yRange: [44, 45],
    entries: [
      { slotNo: 'A09', name: '도미노피자', tenantCategory: 'PIZZA', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A10', name: '광장 식당', tenantCategory: 'KOREAN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A11', name: 'KFC', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A12', name: '꼬꼬닭', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A13', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      {
        // 정오님(jeongoheo) 다회용기 시범 매장 — 목업. 공식 슬롯 번호 미정 → 임시 코드.
        slotNo: 'JUNGO_01',
        name: '정오',
        tenantCategory: 'CAFE',
        slotKind: 'CAFE',
        isFoodMapVisible: true,
        officialSlotNo: null,
        isCodeProvisional: true,
        sourceConfidence: 'LOW',
        verificationStatus: DEFAULT_VERIFICATION_STATUS,
        xPct: 50,
        yPct: 38,
        landmarkNote: '1층 중앙 복도 다회용기 시범 매장 (목업)',
        publicNote: '다회용기 사용·반납 인증이 가능한 시범 매장입니다.',
        placeholderMenuName: '다회용컵 아메리카노',
        container: {
          reusablePolicy: 'SUPPORTED',
          personalPolicy: 'SUPPORTED',
          usesReusableContainer: true,
          personalContainerAllowed: true,
          reusableContainerRequired: false,
          depositKrw: 1000,
          personalDiscountKrw: 300,
          containerType: '다회용컵',
        },
      },
    ],
  },
  {
    floorCode: '1F',
    nearestGateCode: 'ENTRY_5',
    side: 'CENTER',
    areaLabel: '1층 중앙 매표소 앞',
    xRange: [30, 64],
    yRange: [74, 76],
    entries: [
      { slotNo: 'A14', name: '제 2 매표소', tenantCategory: 'TICKET', slotKind: 'TICKET', isFoodMapVisible: false, isTenantable: false, placeholderMenuName: '현장 서비스' },
      { slotNo: 'A15', name: '제 3 매표소', tenantCategory: 'TICKET', slotKind: 'TICKET', isFoodMapVisible: false, isTenantable: false, placeholderMenuName: '현장 서비스' },
      { slotNo: 'A18', name: '제 1 매표소 / 무인 발권기', tenantCategory: 'TICKET', slotKind: 'TICKET', isFoodMapVisible: false, isTenantable: false, nearestGateCode: 'GATE_1_1', placeholderMenuName: '현장 서비스' },
      { slotNo: 'A25', name: '무인 발권기', tenantCategory: 'TICKET', slotKind: 'TICKET', isFoodMapVisible: false, isTenantable: false, nearestGateCode: 'ENTRY_6', placeholderMenuName: '현장 서비스' },
      { slotNo: 'A27', name: '중앙 매표소', tenantCategory: 'TICKET', slotKind: 'TICKET', isFoodMapVisible: false, isTenantable: false, nearestGateCode: 'GATE_1_5', placeholderMenuName: '현장 서비스' },
    ],
  },
  {
    floorCode: '1F',
    nearestGateCode: 'FIRST_BASE_INFIELD',
    side: 'FIRST_BASE',
    areaLabel: '1층 1루 내야 복도',
    xRange: [68, 90],
    yRange: [48, 66],
    entries: [
      { slotNo: 'A16', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'A17', name: '수내닭꼬치', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A19', name: '명인만두', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A20', name: '맘스터치', tenantCategory: 'BURGER', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A21', name: 'BBQ', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'A22', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true, nearestGateCode: 'FIRST_BASE_OUTFIELD', areaLabel: '1층 1루 외야 복도' },
      { slotNo: 'A23', name: '트윈스 팀 스토어', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, nearestGateCode: 'FIRST_BASE_OUTFIELD', areaLabel: '1층 1루 외야 복도', placeholderMenuName: '대표 상품' },
      { slotNo: 'A26', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true, nearestGateCode: 'FIRST_BASE_OUTFIELD', areaLabel: '1층 1루 외야 복도' },
      { slotNo: 'A28', name: '코카-콜라 팝업 스토어', tenantCategory: 'POPUP', slotKind: 'OTHER', isFoodMapVisible: true, nearestGateCode: 'FIRST_BASE_OUTFIELD', areaLabel: '1층 1루 외야 복도', placeholderMenuName: '대표 상품' },
    ],
  },
  {
    floorCode: '2F',
    nearestGateCode: 'GATE_2_1',
    side: 'THIRD_BASE',
    areaLabel: '2층 3루 내야 복도',
    xRange: [12, 42],
    yRange: [68, 46],
    entries: [
      { slotNo: 'B01', name: 'BHC', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B02', name: '까페 그라운드', tenantCategory: 'CAFE', slotKind: 'CAFE', isFoodMapVisible: true },
      { slotNo: 'B03', name: '피자헛', tenantCategory: 'PIZZA', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B04', name: '송사부 고로케', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B05', name: '죠스 떡볶이', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B06', name: '통밥', tenantCategory: 'KOREAN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B07', name: '달곰', tenantCategory: 'DESSERT', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B08', name: '와팡', tenantCategory: 'DESSERT', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B09', name: '원정 구단 상품샵', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
      { slotNo: 'B10', name: '원정 구단 상품샵', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
      { slotNo: 'B11', name: 'KFC', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B12', name: 'BBQ', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B13', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'B14', name: '원정 구단 상품샵', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
    ],
  },
  {
    floorCode: '2F',
    nearestGateCode: 'GATE_2_2',
    side: 'CENTER',
    areaLabel: '2층 중앙 복도',
    xRange: [48, 62],
    yRange: [44, 52],
    entries: [
      { slotNo: 'B17', name: '트윈스 팀 스토어', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
      { slotNo: 'B18', name: '프로스펙스 어센틱샵', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
      { slotNo: 'B19', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'B20', name: 'BBQ', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B21', name: '맘스터치', tenantCategory: 'BURGER', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B22', name: '잔망루피 콜라보샵', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
      { slotNo: 'B23', name: '트윈스 팀스토어', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
      { slotNo: 'B24', name: '꼬꼬닭 카페', tenantCategory: 'CAFE', slotKind: 'CAFE', isFoodMapVisible: true },
      { slotNo: 'B25', name: '트윈스존', tenantCategory: 'MERCHANDISE', slotKind: 'GOODS', isFoodMapVisible: false, placeholderMenuName: '대표 상품' },
    ],
  },
  {
    floorCode: '2F',
    nearestGateCode: 'GATE_2_3',
    side: 'FIRST_BASE',
    areaLabel: '2층 1루 내야 복도',
    xRange: [66, 94],
    yRange: [46, 68],
    entries: [
      { slotNo: 'B26', name: '갑도리 닭강정 / 초량본가어묵', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B27', name: 'Miss&Mr Potato', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B28', name: '잠실원샷', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B29', name: '辛철판', tenantCategory: 'KOREAN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B30', name: '명인만두', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B31', name: '백미당', tenantCategory: 'DESSERT', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B32', name: '맥주창고', tenantCategory: 'BEER', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B33', name: '죠스 떡볶이', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B34', name: '앤티앤스 프레즐', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B35', name: '피자헛', tenantCategory: 'PIZZA', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B36', name: 'BHC', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B37', name: '수내닭꼬치', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B38', name: 'Mr. Pizza', tenantCategory: 'PIZZA', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B39', name: 'XOXO 핫도그', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B40', name: '이가네 떡볶이', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'B41', name: '辛철판', tenantCategory: 'KOREAN', slotKind: 'FOOD', isFoodMapVisible: true },
    ],
  },
  {
    floorCode: '2.5F',
    nearestGateCode: 'GATE_2_2',
    side: 'CENTER',
    areaLabel: '2.5층 중앙 복도',
    xRange: [36, 64],
    yRange: [48, 54],
    entries: [
      { slotNo: 'C01', name: '짝태 패밀리', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'C02', name: '놀이방', tenantCategory: 'FACILITY', slotKind: 'FAMILY', isFoodMapVisible: false, isTenantable: false, placeholderMenuName: '이용 안내' },
      { slotNo: 'C03', name: '수유실', tenantCategory: 'FACILITY', slotKind: 'FAMILY', isFoodMapVisible: false, isTenantable: false, placeholderMenuName: '이용 안내' },
      { slotNo: 'C04', name: '와팡', tenantCategory: 'DESSERT', slotKind: 'FOOD', isFoodMapVisible: true, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '2.5층 1루 복도' },
      { slotNo: 'C05', name: '통밥', tenantCategory: 'KOREAN', slotKind: 'FOOD', isFoodMapVisible: true, nearestGateCode: 'GATE_2_3', side: 'FIRST_BASE', areaLabel: '2.5층 1루 복도' },
    ],
  },
  {
    floorCode: '3F',
    nearestGateCode: 'GATE_2_1',
    side: 'THIRD_BASE',
    areaLabel: '3층 3루 복도',
    xRange: [14, 42],
    yRange: [66, 48],
    entries: [
      { slotNo: 'D01', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'D02', name: '스태프 핫도그', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'D03', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'D04', name: 'KFC', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true, nearestGateCode: 'GATE_2_2', side: 'CENTER', areaLabel: '3층 중앙 복도' },
      { slotNo: 'D05', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true, nearestGateCode: 'GATE_2_2', side: 'CENTER', areaLabel: '3층 중앙 복도' },
    ],
  },
  {
    floorCode: '3F',
    nearestGateCode: 'GATE_2_3',
    side: 'FIRST_BASE',
    areaLabel: '3층 1루 복도',
    xRange: [56, 92],
    yRange: [48, 68],
    entries: [
      { slotNo: 'D06', name: '와팡', tenantCategory: 'DESSERT', slotKind: 'FOOD', isFoodMapVisible: true, nearestGateCode: 'GATE_2_2', side: 'CENTER', areaLabel: '3층 중앙 복도' },
      { slotNo: 'D07', name: 'BBQ', tenantCategory: 'CHICKEN', slotKind: 'FOOD', isFoodMapVisible: true, nearestGateCode: 'GATE_2_2', side: 'CENTER', areaLabel: '3층 중앙 복도' },
      { slotNo: 'D08', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'D09', name: '맘스터치', tenantCategory: 'BURGER', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'D10', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
      { slotNo: 'D11', name: '스태프 핫도그', tenantCategory: 'SNACK', slotKind: 'FOOD', isFoodMapVisible: true },
      { slotNo: 'D12', name: 'GS25', tenantCategory: 'CONVENIENCE', slotKind: 'CONVENIENCE', isFoodMapVisible: true },
    ],
  },
  {
    floorCode: '4F',
    nearestGateCode: 'GATE_1_1',
    side: 'CENTER',
    areaLabel: '4층 임시 위치',
    xRange: [44.118, 57.647],
    yRange: [68.421, 68.421],
    entries: [
      {
        slotNo: 'F4_01',
        name: '올떡',
        tenantCategory: 'SNACK',
        slotKind: 'FOOD',
        isFoodMapVisible: true,
        officialSlotNo: null,
        isCodeProvisional: true,
        sourceConfidence: 'LOW',
        verificationStatus: DEFAULT_VERIFICATION_STATUS,
        accessNote: '4층 매장은 공식 슬롯 번호 확인 전까지 임시 코드로 운영합니다.',
        landmarkNote: '3/4층 구조도 하단 4F 목록 기준 임시 위치',
        publicNote: '임시 슬롯 코드 기반 데이터입니다.',
      },
      {
        slotNo: 'F4_02',
        name: '열심히살겠습니다',
        tenantCategory: 'KOREAN',
        slotKind: 'FOOD',
        isFoodMapVisible: true,
        officialSlotNo: null,
        isCodeProvisional: true,
        sourceConfidence: 'LOW',
        verificationStatus: DEFAULT_VERIFICATION_STATUS,
        accessNote: '4층 매장은 공식 슬롯 번호 확인 전까지 임시 코드로 운영합니다.',
        landmarkNote: '3/4층 구조도 하단 4F 목록 기준 임시 위치',
        publicNote: '임시 슬롯 코드 기반 데이터입니다.',
      },
    ],
  },
]

interface ParsedGame {
  date: Date
  startTime: string
  awayTeamCode: string
  homeTeamCode: string
  venue: string
}

// 캐스터가 다음 줄로 넘어간 경우(`키움vsNC` 류) 이전 줄에 이어붙임.
// 줄의 첫 토큰이 날짜(MM.DD)도 시각(HH:MM)도 아니면 연속선으로 간주.
function preprocessLines(raw: string): string[] {
  const out: string[] = []
  for (const rawLine of raw.split('\n')) {
    const t = rawLine.trim()
    if (!t) continue
    const first = t.split(/\s+/)[0]
    const isStart = /^\d{2}\.\d{2}/.test(first) || /^\d{2}:\d{2}/.test(first)
    if (isStart || out.length === 0) {
      out.push(t)
    } else {
      out[out.length - 1] += ' ' + t
    }
  }
  return out
}

function parseSchedule(raw: string): ParsedGame[] {
  const games: ParsedGame[] = []
  let currentDate: Date | null = null

  for (const line of preprocessLines(raw)) {
    const tokens = line.split(/\s+/).filter(Boolean)
    let offset = 0

    if (/^\d{2}\.\d{2}/.test(tokens[0])) {
      const m = tokens[0].match(/^(\d{2})\.(\d{2})/)
      if (m) {
        const [, mm, dd] = m
        currentDate = new Date(Date.UTC(SCHEDULE_YEAR, Number(mm) - 1, Number(dd)))
        offset = 1
      }
    }

    if (!currentDate) continue
    const time = tokens[offset]
    const matchup = tokens[offset + 1]
    if (!time || !matchup) continue

    // venue를 known set으로 스캔 — 포맷 차이(프리뷰/캐스터 컬럼)에 강건
    let venueIdx = -1
    for (let i = offset + 2; i < tokens.length; i++) {
      if (VENUES.has(tokens[i])) { venueIdx = i; break }
    }
    if (venueIdx === -1) {
      throw new Error(`venue를 찾지 못함: "${line}"`)
    }
    const venue = tokens[venueIdx]

    const m = matchup.match(MATCH_PATTERN)
    if (!m) throw new Error(`경기 매치업 파싱 실패: "${matchup}" (line: "${line}")`)
    const [, awayName, homeName] = m

    games.push({
      date: currentDate,
      startTime: time,
      awayTeamCode: TEAM_NAME_TO_CODE[awayName]!,
      homeTeamCode: TEAM_NAME_TO_CODE[homeName]!,
      venue,
    })
  }

  return games
}

function hasStadiumFoodMapModels() {
  return STADIUM_FOOD_MAP_MODELS.every((modelName) => db[modelName])
}

function interpolate(range: [number, number], index: number, total: number) {
  if (total <= 1) return range[0]
  const ratio = index / (total - 1)
  return Number((range[0] + (range[1] - range[0]) * ratio).toFixed(1))
}

function buildSlotId(slotNo: string) {
  return `${STADIUM_CODE}-${slotNo}`
}

function buildFloorId(floorCode: string) {
  return `${STADIUM_CODE}-${floorCode}`
}

function buildGateId(gateCode: string) {
  return `${STADIUM_CODE}-${gateCode}`
}

function normalizeTenantName(name: string) {
  return name.normalize('NFKC').toLowerCase().replace(/[\s/&.-]+/g, '')
}

function getPlaceholderMenuName(slot: SlotSeedInput) {
  if (slot.placeholderMenuName) return slot.placeholderMenuName
  if (slot.slotKind === 'GOODS') return '대표 상품'
  if (slot.slotKind === 'TICKET') return '현장 서비스'
  if (slot.slotKind === 'FAMILY') return '이용 안내'
  return '대표 메뉴'
}

function getPlaceholderMenuCategory(slot: SlotSeedInput) {
  if (slot.slotKind === 'GOODS') return 'OTHER'
  if (slot.slotKind === 'TICKET') return 'OTHER'
  if (slot.slotKind === 'FAMILY') return 'OTHER'
  return 'MAIN'
}

function materializeSlotSeeds(): SlotSeedInput[] {
  return SLOT_GROUPS.flatMap((group) =>
    group.entries.map((entry, index) => {
      const ocrCoordinate = OCR_SLOT_COORDINATES[entry.slotNo]

      return {
        floorCode: group.floorCode,
        slotNo: entry.slotNo,
        name: entry.name,
        tenantCategory: entry.tenantCategory,
        slotKind: entry.slotKind,
        nearestGateCode: entry.nearestGateCode ?? ocrCoordinate?.nearestGateCode ?? group.nearestGateCode,
        side: entry.side ?? ocrCoordinate?.side ?? group.side,
        areaLabel: entry.areaLabel ?? ocrCoordinate?.areaLabel ?? group.areaLabel,
        xPct: entry.xPct ?? ocrCoordinate?.xPct ?? interpolate(group.xRange, index, group.entries.length),
        yPct: entry.yPct ?? ocrCoordinate?.yPct ?? interpolate(group.yRange, index, group.entries.length),
        isFoodMapVisible: entry.isFoodMapVisible,
        isTenantable: entry.isTenantable ?? true,
        officialSlotNo: entry.officialSlotNo ?? entry.slotNo,
        isCodeProvisional: entry.isCodeProvisional ?? false,
        sourceConfidence: entry.sourceConfidence ?? ocrCoordinate?.sourceConfidence ?? DEFAULT_SOURCE_CONFIDENCE,
        verificationStatus: entry.verificationStatus ?? DEFAULT_VERIFICATION_STATUS,
        accessNote: entry.accessNote,
        landmarkNote: entry.landmarkNote,
        publicNote: entry.publicNote,
        badgeLabel: entry.badgeLabel ?? DEFAULT_PRICE_TEXT,
        placeholderMenuName: entry.placeholderMenuName,
        container: entry.container,
      }
    }),
  )
}

async function createManyAndSync(modelName: string, rows: SeedRow[]) {
  if (!rows.length) return
  const delegate = db[modelName]
  await delegate.createMany({
    data: rows,
    skipDuplicates: true,
  })

  for (const row of rows) {
    const { id, ...data } = row
    if (typeof id !== 'string') continue
    await delegate.update({
      where: { id },
      data,
    })
  }
}

async function ensureTenantStore(slot: SlotSeedInput) {
  const normalizedName = normalizeTenantName(slot.name)
  const tenantStoreData = {
    name: slot.name,
    brandName: slot.name,
    normalizedName,
    category: slot.tenantCategory,
    defaultHoursText: DEFAULT_HOURS_TEXT,
    defaultReusableContainerPolicy: slot.container?.reusablePolicy ?? DEFAULT_CONTAINER_POLICY,
    defaultPersonalContainerPolicy: slot.container?.personalPolicy ?? DEFAULT_CONTAINER_POLICY,
    publicNote: slot.publicNote ?? null,
  }

  const existing = await db.tenantStore.findFirst({
    where: { normalizedName },
  })

  if (existing) {
    return db.tenantStore.update({
      where: { id: existing.id },
      data: tenantStoreData,
    })
  }

  return db.tenantStore.create({
    data: tenantStoreData,
  })
}

async function ensureAssignment(slot: SlotSeedInput, tenantStoreId: bigint | number) {
  const assignmentData = {
    slotId: buildSlotId(slot.slotNo),
    tenantStoreId,
    seasonYear: STADIUM_FOOD_MAP_SEASON_YEAR,
    status: DEFAULT_ASSIGNMENT_STATUS,
    startsOn: new Date(Date.UTC(STADIUM_FOOD_MAP_SEASON_YEAR, 0, 1)),
    displayNameOverride: slot.name,
    badgeLabel: slot.badgeLabel ?? DEFAULT_PRICE_TEXT,
    publicNote: slot.publicNote ?? null,
    sourceRef: FLOOR_SOURCE_REFS[slot.floorCode],
    sourceConfidence: slot.sourceConfidence ?? DEFAULT_SOURCE_CONFIDENCE,
  }

  const existing = await db.storeAssignment.findFirst({
    where: {
      slotId: buildSlotId(slot.slotNo),
      seasonYear: STADIUM_FOOD_MAP_SEASON_YEAR,
      status: DEFAULT_ASSIGNMENT_STATUS,
    },
  })

  if (existing) {
    return db.storeAssignment.update({
      where: { id: existing.id },
      data: assignmentData,
    })
  }

  return db.storeAssignment.create({
    data: assignmentData,
  })
}

async function ensureTenantMenuItem(slot: SlotSeedInput, tenantStoreId: bigint | number) {
  const name = getPlaceholderMenuName(slot)
  const menuItemData = {
    tenantStoreId,
    name,
    category: getPlaceholderMenuCategory(slot),
    basePriceKrw: null,
    basePriceText: DEFAULT_PRICE_TEXT,
    sourceRef: FLOOR_SOURCE_REFS[slot.floorCode],
    sourceConfidence: slot.sourceConfidence ?? DEFAULT_SOURCE_CONFIDENCE,
    verificationStatus: slot.verificationStatus ?? DEFAULT_VERIFICATION_STATUS,
    isActive: true,
  }

  const existing = await db.tenantMenuItem.findFirst({
    where: {
      tenantStoreId,
      name,
    },
  })

  if (existing) {
    return db.tenantMenuItem.update({
      where: { id: existing.id },
      data: menuItemData,
    })
  }

  return db.tenantMenuItem.create({
    data: menuItemData,
  })
}

async function ensureStoreMenuOffering(slot: SlotSeedInput, assignmentId: bigint | number, menuItemId: bigint | number) {
  const offeringData = {
    assignmentId,
    menuItemId,
    priceKrw: null,
    priceText: DEFAULT_PRICE_TEXT,
    saleStatus: DEFAULT_MENU_SALE_STATUS,
    sortOrder: 0,
    usesReusableContainer: slot.container?.usesReusableContainer ?? null,
    personalContainerAllowed: slot.container?.personalContainerAllowed ?? null,
    reusableContainerRequired: slot.container?.reusableContainerRequired ?? null,
    containerDepositKrw: slot.container?.depositKrw ?? null,
    personalContainerDiscountKrw: slot.container?.personalDiscountKrw ?? null,
    containerType: slot.container?.containerType ?? null,
    sourceRef: FLOOR_SOURCE_REFS[slot.floorCode],
    sourceConfidence: slot.sourceConfidence ?? DEFAULT_SOURCE_CONFIDENCE,
    verificationStatus: slot.verificationStatus ?? DEFAULT_VERIFICATION_STATUS,
  }

  const existing = await db.storeMenuOffering.findFirst({
    where: {
      assignmentId,
      menuItemId,
    },
  })

  if (existing) {
    return db.storeMenuOffering.update({
      where: { id: existing.id },
      data: offeringData,
    })
  }

  return db.storeMenuOffering.create({
    data: offeringData,
  })
}

async function ensureStoreOperatingRule(slot: SlotSeedInput, assignmentId: bigint | number) {
  const ruleData = {
    assignmentId,
    ruleType: DEFAULT_RULE_TYPE,
    openMinutesBeforeGame: 120,
    closeTiming: 'GAME_END',
    textOverride: DEFAULT_HOURS_TEXT,
    isActive: true,
  }

  const existing = await db.storeOperatingRule.findFirst({
    where: {
      assignmentId,
      ruleType: DEFAULT_RULE_TYPE,
    },
  })

  if (existing) {
    return db.storeOperatingRule.update({
      where: { id: existing.id },
      data: ruleData,
    })
  }

  return db.storeOperatingRule.create({
    data: ruleData,
  })
}

async function seedStadiumFoodMap() {
  if (!hasStadiumFoodMapModels()) {
    console.log('stadium food map 모델이 아직 Prisma Client에 없어 seedStadiumFoodMap()을 건너뜁니다.')
    return
  }

  const slotSeeds = materializeSlotSeeds()
  const slotRows = slotSeeds.map((slot) => ({
    id: buildSlotId(slot.slotNo),
    stadiumCode: STADIUM_CODE,
    floorId: buildFloorId(slot.floorCode),
    nearestGateId: buildGateId(slot.nearestGateCode),
    slotNo: slot.slotNo,
    officialSlotNo: slot.officialSlotNo ?? null,
    isCodeProvisional: slot.isCodeProvisional ?? false,
    slotKind: slot.slotKind,
    side: slot.side,
    areaLabel: slot.areaLabel,
    xPct: slot.xPct,
    yPct: slot.yPct,
    accessNote: slot.accessNote ?? null,
    landmarkNote: slot.landmarkNote ?? null,
    sourceRef: FLOOR_SOURCE_REFS[slot.floorCode],
    sourceConfidence: slot.sourceConfidence ?? DEFAULT_SOURCE_CONFIDENCE,
    verificationStatus: slot.verificationStatus ?? DEFAULT_VERIFICATION_STATUS,
    isTenantable: slot.isTenantable ?? true,
    isFoodMapVisible: slot.isFoodMapVisible,
    isActive: true,
  }))

  await db.stadium.upsert({
    where: { code: STADIUM_CODE },
    create: {
      code: STADIUM_CODE,
      name: '잠실야구장',
      shortName: '잠실',
      address: '서울특별시 송파구 올림픽로 25',
    },
    update: {
      name: '잠실야구장',
      shortName: '잠실',
      address: '서울특별시 송파구 올림픽로 25',
    },
  })

  await createManyAndSync('stadiumFloor', STADIUM_FLOORS)
  await createManyAndSync('stadiumGate', STADIUM_GATES)
  await createManyAndSync('storeSlot', slotRows)

  for (const slot of slotSeeds) {
    const tenantStore = await ensureTenantStore(slot)
    const assignment = await ensureAssignment(slot, tenantStore.id)
    const menuItem = await ensureTenantMenuItem(slot, tenantStore.id)
    await ensureStoreMenuOffering(slot, assignment.id, menuItem.id)
    await ensureStoreOperatingRule(slot, assignment.id)
  }

  console.log(
    `stadium food map 시드 완료 (${STADIUM_FLOORS.length}개 층 / ${STADIUM_GATES.length}개 게이트 / ${slotSeeds.length}개 슬롯, source=${STADIUM_FOOD_MAP_SOURCE_VERSION})`,
  )
}

async function seedTeams() {
  for (const team of KBO_TEAMS) {
    await prisma.team.upsert({
      where: { code: team.code },
      create: team,
      update: team,
    })
  }
  console.log(`teams 시드 완료 (${KBO_TEAMS.length}건)`)
}

async function seedGames() {
  const games = parseSchedule(SCHEDULE_RAW)
  const result = await prisma.game.createMany({
    data: games,
    skipDuplicates: true, // (date, away, home) 유니크 제약 기반
  })
  console.log(`games 시드 완료 (신규 ${result.count}건 / 입력 ${games.length}건)`)
}

async function main() {
  await seedTeams()
  await seedGames()
  await seedStadiumFoodMap()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
