import { ApiError, api } from './apiClient'

export type VerificationStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'VERIFIED'
export type PolicyChoice = 'USE_DEFAULT' | 'ALLOWED' | 'DISALLOWED' | 'CHECK_ON_SITE' | null

export interface StoreSlot {
  id: string
  stadiumCode: string
  floor: string
  slotCode: string
  officialSlotNo: string | null
  gate: string | null
  category: string
  xPct: number | null
  yPct: number | null
  sectionHint: string | null
  landmarkNote: string | null
  isFoodMapVisible: boolean
  isCodeProvisional: boolean
  verificationStatus: VerificationStatus
  sourceConfidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface TenantStore {
  id: string
  name: string
  brandName: string
  category: string
  description: string | null
  defaultHoursText: string | null
  defaultReusableContainerPolicy: PolicyChoice
  defaultPersonalContainerPolicy: PolicyChoice
  verificationStatus: VerificationStatus
}

export interface StoreAssignment {
  id: string
  slotId: string
  tenantStoreId: string
  seasonYear: number
  status: 'ACTIVE' | 'PLANNED' | 'TEMP_CLOSED' | 'ENDED'
  displayNameOverride: string | null
  hoursText: string | null
  publicNote: string | null
  verificationStatus: VerificationStatus
}

export interface TenantMenuItem {
  id: string
  tenantStoreId: string
  name: string
  category: string
  description: string | null
  basePriceKrw: number | null
  basePriceText: string | null
  isActive: boolean
  isSignature: boolean
  verificationStatus: VerificationStatus
}

export interface StoreMenuOffering {
  id: string
  assignmentId: string
  menuItemId: string
  priceKrw: number | null
  priceText: string | null
  saleStatus: 'ON_SALE' | 'SOLD_OUT' | 'HIDDEN'
  sortOrder: number
  note: string | null
  usesReusableContainer: PolicyChoice
  personalContainerAllowed: PolicyChoice
  verificationStatus: VerificationStatus
}

export interface StoreOperatingRule {
  id: string
  assignmentId: string
  ruleType:
    | 'ALL_DAYS'
    | 'GAME_DAY'
    | 'NON_GAME_DAY'
    | 'WEEKDAY'
    | 'WEEKEND'
    | 'SPECIAL_DATE'
    | 'TEXT_ONLY'
  isActive: boolean
  openTime: string | null
  closeTime: string | null
  textOverride: string | null
  verificationStatus: VerificationStatus
}

export interface StoreNotice {
  id: string
  title: string
  body: string
  noticeType: 'GENERAL' | 'TEMP_CLOSED' | 'SOLD_OUT' | 'EVENT' | 'DELAY' | 'MENU_CHANGED'
  isPublic: boolean
  slotId: string | null
  tenantStoreId: string | null
  assignmentId: string | null
  verificationStatus: VerificationStatus
}

export interface AdminStoresCollections {
  storeSlots: StoreSlot[]
  tenantStores: TenantStore[]
  storeAssignments: StoreAssignment[]
  tenantMenuItems: TenantMenuItem[]
  storeMenuOfferings: StoreMenuOffering[]
  storeOperatingRules: StoreOperatingRule[]
  storeNotices: StoreNotice[]
}

export interface AdminListResult<T> {
  items: T[]
  source: 'api' | 'fallback'
  error?: string
}

export interface AdminStoresDataset {
  storeSlots: AdminListResult<StoreSlot>
  tenantStores: AdminListResult<TenantStore>
  storeAssignments: AdminListResult<StoreAssignment>
  tenantMenuItems: AdminListResult<TenantMenuItem>
  storeMenuOfferings: AdminListResult<StoreMenuOffering>
  storeOperatingRules: AdminListResult<StoreOperatingRule>
  storeNotices: AdminListResult<StoreNotice>
}

export const ADMIN_STORES_FALLBACK_DATA: AdminStoresCollections = {
  storeSlots: [
    {
      id: 'slot-b20-sample',
      stadiumCode: 'JAMSIL',
      floor: '2F',
      slotCode: 'JAMSIL-B20',
      officialSlotNo: 'B20',
      gate: 'GATE_2',
      category: 'CHICKEN',
      xPct: 38,
      yPct: 44,
      sectionHint: '1루 내야 213-215',
      landmarkNote: '중앙 복도 코너',
      isFoodMapVisible: true,
      isCodeProvisional: false,
      verificationStatus: 'VERIFIED',
      sourceConfidence: 'HIGH',
    },
    {
      id: 'slot-c04-sample',
      stadiumCode: 'JAMSIL',
      floor: '2.5F',
      slotCode: 'JAMSIL-C04',
      officialSlotNo: 'C04',
      gate: 'GATE_1_1',
      category: 'DESSERT',
      xPct: 64.412,
      yPct: 76.316,
      sectionHint: '2.5층 중앙 하단',
      landmarkNote: '와플/음료 매장',
      isFoodMapVisible: true,
      isCodeProvisional: false,
      verificationStatus: 'NEEDS_REVIEW',
      sourceConfidence: 'MEDIUM',
    },
    {
      id: 'slot-f4-01-sample',
      stadiumCode: 'JAMSIL',
      floor: '4F',
      slotCode: 'JAMSIL-F4-01',
      officialSlotNo: null,
      gate: null,
      category: 'KOREAN_SNACK',
      xPct: 49,
      yPct: 18,
      sectionHint: '4층 중앙',
      landmarkNote: '현장 스크린샷 기반 임시 코드',
      isFoodMapVisible: true,
      isCodeProvisional: true,
      verificationStatus: 'DRAFT',
      sourceConfidence: 'LOW',
    },
  ],
  tenantStores: [
    {
      id: 'tenant-bbq-sample',
      name: 'BBQ 잠실볼파크점',
      brandName: 'BBQ',
      category: 'CHICKEN',
      description: '치킨과 맥주 중심 매장',
      defaultHoursText: '경기 시작 2시간 전부터 8회말까지',
      defaultReusableContainerPolicy: 'ALLOWED',
      defaultPersonalContainerPolicy: 'CHECK_ON_SITE',
      verificationStatus: 'VERIFIED',
    },
    {
      id: 'tenant-wapang-sample',
      name: '와팡',
      brandName: '와팡',
      category: 'DESSERT',
      description: '와플, 커피, 에이드 중심 매장',
      defaultHoursText: '경기 시작 2시간 전부터 경기 종료 후 30분까지',
      defaultReusableContainerPolicy: 'ALLOWED',
      defaultPersonalContainerPolicy: 'ALLOWED',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'tenant-olddeok-sample',
      name: '올떡',
      brandName: '올떡',
      category: 'KOREAN_SNACK',
      description: '떡볶이, 순대, 어묵 중심 분식 매장',
      defaultHoursText: '경기 시작 2시간 전부터 경기 종료까지',
      defaultReusableContainerPolicy: 'ALLOWED',
      defaultPersonalContainerPolicy: 'DISALLOWED',
      verificationStatus: 'DRAFT',
    },
  ],
  storeAssignments: [
    {
      id: 'assignment-b20-sample',
      slotId: 'slot-b20-sample',
      tenantStoreId: 'tenant-bbq-sample',
      seasonYear: 2026,
      status: 'ACTIVE',
      displayNameOverride: null,
      hoursText: '16:30-21:30',
      publicNote: '1루 응원석 주문 몰림',
      verificationStatus: 'VERIFIED',
    },
    {
      id: 'assignment-c04-sample',
      slotId: 'slot-c04-sample',
      tenantStoreId: 'tenant-wapang-sample',
      seasonYear: 2026,
      status: 'ACTIVE',
      displayNameOverride: '와팡',
      hoursText: '경기 시작 2시간 전부터 경기 종료 후 30분까지',
      publicNote: '와플과 음료 주문 줄이 분리될 수 있습니다.',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'assignment-f4-01-sample',
      slotId: 'slot-f4-01-sample',
      tenantStoreId: 'tenant-olddeok-sample',
      seasonYear: 2026,
      status: 'ACTIVE',
      displayNameOverride: '올떡 4층',
      hoursText: '경기 시작 2시간 전부터 경기 종료까지',
      publicNote: '임시 슬롯 코드 기반 데이터입니다.',
      verificationStatus: 'DRAFT',
    },
  ],
  tenantMenuItems: [
    {
      id: 'menu-bbq-half-sample',
      tenantStoreId: 'tenant-bbq-sample',
      name: '황금올리브 반반치킨',
      category: 'MAIN',
      description: '치킨 반반 구성',
      basePriceKrw: 24000,
      basePriceText: '24,000원',
      isActive: true,
      isSignature: true,
      verificationStatus: 'VERIFIED',
    },
    {
      id: 'menu-bbq-beer-sample',
      tenantStoreId: 'tenant-bbq-sample',
      name: '생맥주 500cc',
      category: 'ALCOHOL',
      description: null,
      basePriceKrw: 5500,
      basePriceText: '5,500원',
      isActive: true,
      isSignature: false,
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'menu-bbq-cup-sample',
      tenantStoreId: 'tenant-bbq-sample',
      name: '닭강정컵',
      category: 'SNACK',
      description: '야구장 컵 메뉴',
      basePriceKrw: 9000,
      basePriceText: '9,000원',
      isActive: true,
      isSignature: false,
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'menu-wapang-waffle-sample',
      tenantStoreId: 'tenant-wapang-sample',
      name: '와플 플레이트',
      category: 'DESSERT',
      description: '와플과 토핑 구성',
      basePriceKrw: 6500,
      basePriceText: '6,500원',
      isActive: true,
      isSignature: true,
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'menu-wapang-ice-tea-sample',
      tenantStoreId: 'tenant-wapang-sample',
      name: '아이스티',
      category: 'DRINK',
      description: null,
      basePriceKrw: 4500,
      basePriceText: '4,500원',
      isActive: true,
      isSignature: false,
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'menu-olddeok-tteok-sample',
      tenantStoreId: 'tenant-olddeok-sample',
      name: '떡볶이',
      category: 'MAIN',
      description: '4층 분식 메뉴',
      basePriceKrw: 6000,
      basePriceText: '6,000원',
      isActive: true,
      isSignature: true,
      verificationStatus: 'DRAFT',
    },
    {
      id: 'menu-olddeok-sundae-sample',
      tenantStoreId: 'tenant-olddeok-sample',
      name: '순대',
      category: 'MAIN',
      description: null,
      basePriceKrw: 7000,
      basePriceText: '7,000원',
      isActive: true,
      isSignature: false,
      verificationStatus: 'DRAFT',
    },
  ],
  storeMenuOfferings: [
    {
      id: 'offering-b20-half-sample',
      assignmentId: 'assignment-b20-sample',
      menuItemId: 'menu-bbq-half-sample',
      priceKrw: 25000,
      priceText: '25,000원',
      saleStatus: 'ON_SALE',
      sortOrder: 1,
      note: '현장 세트 옵션 존재',
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'CHECK_ON_SITE',
      verificationStatus: 'VERIFIED',
    },
    {
      id: 'offering-b20-beer-sample',
      assignmentId: 'assignment-b20-sample',
      menuItemId: 'menu-bbq-beer-sample',
      priceKrw: 5500,
      priceText: '5,500원',
      saleStatus: 'ON_SALE',
      sortOrder: 2,
      note: null,
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'ALLOWED',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'offering-b20-cup-sample',
      assignmentId: 'assignment-b20-sample',
      menuItemId: 'menu-bbq-cup-sample',
      priceKrw: 9000,
      priceText: '9,000원',
      saleStatus: 'ON_SALE',
      sortOrder: 3,
      note: '다회용 컵 적용 가능',
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'DISALLOWED',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'offering-c04-waffle-sample',
      assignmentId: 'assignment-c04-sample',
      menuItemId: 'menu-wapang-waffle-sample',
      priceKrw: 6500,
      priceText: '6,500원',
      saleStatus: 'ON_SALE',
      sortOrder: 1,
      note: '다회용 접시 적용 가능',
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'DISALLOWED',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'offering-c04-ice-tea-sample',
      assignmentId: 'assignment-c04-sample',
      menuItemId: 'menu-wapang-ice-tea-sample',
      priceKrw: 4500,
      priceText: '4,500원',
      saleStatus: 'ON_SALE',
      sortOrder: 2,
      note: '개인컵 가능 여부는 현장 확인',
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'ALLOWED',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'offering-f4-01-tteok-sample',
      assignmentId: 'assignment-f4-01-sample',
      menuItemId: 'menu-olddeok-tteok-sample',
      priceKrw: 6000,
      priceText: '6,000원',
      saleStatus: 'ON_SALE',
      sortOrder: 1,
      note: '다회용 볼 적용 가능',
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'DISALLOWED',
      verificationStatus: 'DRAFT',
    },
    {
      id: 'offering-f4-01-sundae-sample',
      assignmentId: 'assignment-f4-01-sample',
      menuItemId: 'menu-olddeok-sundae-sample',
      priceKrw: 7000,
      priceText: '7,000원',
      saleStatus: 'ON_SALE',
      sortOrder: 2,
      note: null,
      usesReusableContainer: 'ALLOWED',
      personalContainerAllowed: 'DISALLOWED',
      verificationStatus: 'DRAFT',
    },
  ],
  storeOperatingRules: [
    {
      id: 'rule-b20-gameday-sample',
      assignmentId: 'assignment-b20-sample',
      ruleType: 'GAME_DAY',
      isActive: true,
      openTime: '16:30',
      closeTime: '21:30',
      textOverride: '경기 시작 2시간 전부터 8회말까지',
      verificationStatus: 'VERIFIED',
    },
    {
      id: 'rule-c04-text-sample',
      assignmentId: 'assignment-c04-sample',
      ruleType: 'TEXT_ONLY',
      isActive: true,
      openTime: null,
      closeTime: null,
      textOverride: '경기 시작 2시간 전부터 경기 종료 후 30분까지',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'rule-f4-gameday-sample',
      assignmentId: 'assignment-f4-01-sample',
      ruleType: 'GAME_DAY',
      isActive: true,
      openTime: '16:30',
      closeTime: '22:00',
      textOverride: '경기 시작 2시간 전부터 경기 종료까지',
      verificationStatus: 'DRAFT',
    },
  ],
  storeNotices: [
    {
      id: 'notice-c04-delay-sample',
      title: '아이스티 개인컵 가능',
      body: '음료 메뉴는 개인컵 이용 가능으로 표시한 목업 데이터입니다.',
      noticeType: 'GENERAL',
      isPublic: true,
      slotId: 'slot-c04-sample',
      tenantStoreId: 'tenant-wapang-sample',
      assignmentId: 'assignment-c04-sample',
      verificationStatus: 'NEEDS_REVIEW',
    },
    {
      id: 'notice-f4-open-sample',
      title: '4층 임시 슬롯 운영',
      body: '올떡 메뉴와 운영 시간은 임시 슬롯 기준 목업 데이터입니다.',
      noticeType: 'GENERAL',
      isPublic: false,
      slotId: 'slot-f4-01-sample',
      tenantStoreId: 'tenant-olddeok-sample',
      assignmentId: 'assignment-f4-01-sample',
      verificationStatus: 'DRAFT',
    },
  ],
}

const LIST_RESPONSE_KEYS = [
  'items',
  'data',
  'results',
  'storeSlots',
  'tenantStores',
  'storeAssignments',
  'assignments',
  'tenantMenuItems',
  'menuOfferings',
  'storeMenuOfferings',
  'operatingRules',
  'storeOperatingRules',
  'notices',
  'storeNotices',
]

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  for (const key of LIST_RESPONSE_KEYS) {
    if (Array.isArray(record[key])) return record[key] as T[]
  }
  return []
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return `${error.status} ${error.message}`
  if (error instanceof Error) return error.message
  return '알 수 없는 오류'
}

async function listResource<T>(paths: string[], fallback: T[]): Promise<AdminListResult<T>> {
  let lastError: unknown = null

  for (const path of paths) {
    try {
      const payload = await api.get<unknown>(path)
      return {
        items: extractList<T>(payload),
        source: 'api',
      }
    } catch (error) {
      lastError = error
    }
  }

  return {
    items: fallback,
    source: 'fallback',
    error: getErrorMessage(lastError),
  }
}

function fallbackList<T>(items: T[], error: string): AdminListResult<T> {
  return {
    items,
    source: 'fallback',
    error,
  }
}

export async function loadAdminStoresDataset(): Promise<AdminStoresDataset> {
  const [
    storeSlots,
    tenantStores,
    storeAssignments,
    tenantMenuItems,
    storeMenuOfferings,
    storeOperatingRules,
    storeNotices,
  ] = await Promise.all([
    listResource(['/stadiums/JAMSIL/store-slots', '/admin/store-slots'], ADMIN_STORES_FALLBACK_DATA.storeSlots),
    listResource(['/admin/tenant-stores', '/tenant-stores?stadiumCode=JAMSIL'], ADMIN_STORES_FALLBACK_DATA.tenantStores),
    listResource(['/admin/store-assignments'], ADMIN_STORES_FALLBACK_DATA.storeAssignments),
    listResource(['/admin/tenant-menu-items'], ADMIN_STORES_FALLBACK_DATA.tenantMenuItems),
    listResource(['/admin/store-menu-offerings'], ADMIN_STORES_FALLBACK_DATA.storeMenuOfferings),
    listResource(['/admin/store-operating-rules'], ADMIN_STORES_FALLBACK_DATA.storeOperatingRules),
    listResource(['/admin/store-notices'], ADMIN_STORES_FALLBACK_DATA.storeNotices),
  ])

  const coreResourcesAreEmpty =
    storeSlots.source === 'api' &&
    tenantStores.source === 'api' &&
    storeAssignments.source === 'api' &&
    storeSlots.items.length === 0 &&
    tenantStores.items.length === 0 &&
    storeAssignments.items.length === 0

  if (coreResourcesAreEmpty) {
    const error = 'core resources returned an empty list'
    return {
      storeSlots: fallbackList(ADMIN_STORES_FALLBACK_DATA.storeSlots, error),
      tenantStores: fallbackList(ADMIN_STORES_FALLBACK_DATA.tenantStores, error),
      storeAssignments: fallbackList(ADMIN_STORES_FALLBACK_DATA.storeAssignments, error),
      tenantMenuItems: fallbackList(ADMIN_STORES_FALLBACK_DATA.tenantMenuItems, error),
      storeMenuOfferings: fallbackList(ADMIN_STORES_FALLBACK_DATA.storeMenuOfferings, error),
      storeOperatingRules: fallbackList(ADMIN_STORES_FALLBACK_DATA.storeOperatingRules, error),
      storeNotices: fallbackList(ADMIN_STORES_FALLBACK_DATA.storeNotices, error),
    }
  }

  return {
    storeSlots,
    tenantStores,
    storeAssignments,
    tenantMenuItems,
    storeMenuOfferings,
    storeOperatingRules,
    storeNotices,
  }
}

export const adminStoresApi = {
  loadAdminStoresDataset,
  listStoreSlots: () => listResource(['/stadiums/JAMSIL/store-slots', '/admin/store-slots'], ADMIN_STORES_FALLBACK_DATA.storeSlots),
  createStoreSlot: (body: Partial<StoreSlot>) => api.post<StoreSlot>('/admin/store-slots', body),
  patchStoreSlot: (id: string, body: Partial<StoreSlot>) => api.patch<StoreSlot>(`/admin/store-slots/${id}`, body),
  deleteStoreSlot: (id: string) => api.delete<void>(`/admin/store-slots/${id}`),

  listTenantStores: () => listResource(['/admin/tenant-stores', '/tenant-stores?stadiumCode=JAMSIL'], ADMIN_STORES_FALLBACK_DATA.tenantStores),
  createTenantStore: (body: Partial<TenantStore>) => api.post<TenantStore>('/admin/tenant-stores', body),
  patchTenantStore: (id: string, body: Partial<TenantStore>) => api.patch<TenantStore>(`/admin/tenant-stores/${id}`, body),
  deleteTenantStore: (id: string) => api.delete<void>(`/admin/tenant-stores/${id}`),

  listStoreAssignments: () => listResource(['/admin/store-assignments'], ADMIN_STORES_FALLBACK_DATA.storeAssignments),
  createStoreAssignment: (body: Partial<StoreAssignment>) => api.post<StoreAssignment>('/admin/store-assignments', body),
  patchStoreAssignment: (id: string, body: Partial<StoreAssignment>) => api.patch<StoreAssignment>(`/admin/store-assignments/${id}`, body),
  deleteStoreAssignment: (id: string) => api.delete<void>(`/admin/store-assignments/${id}`),

  listTenantMenuItems: () => listResource(['/admin/tenant-menu-items'], ADMIN_STORES_FALLBACK_DATA.tenantMenuItems),
  createTenantMenuItem: (tenantStoreId: string, body: Partial<TenantMenuItem>) =>
    api.post<TenantMenuItem>(`/admin/tenant-stores/${tenantStoreId}/menu-items`, body),
  patchTenantMenuItem: (id: string, body: Partial<TenantMenuItem>) => api.patch<TenantMenuItem>(`/admin/tenant-menu-items/${id}`, body),
  deleteTenantMenuItem: (id: string) => api.delete<void>(`/admin/tenant-menu-items/${id}`),

  listStoreMenuOfferings: () => listResource(['/admin/store-menu-offerings'], ADMIN_STORES_FALLBACK_DATA.storeMenuOfferings),
  createStoreMenuOffering: (assignmentId: string, body: Partial<StoreMenuOffering>) =>
    api.post<StoreMenuOffering>(`/admin/store-assignments/${assignmentId}/menu-offerings`, body),
  patchStoreMenuOffering: (id: string, body: Partial<StoreMenuOffering>) =>
    api.patch<StoreMenuOffering>(`/admin/store-menu-offerings/${id}`, body),
  deleteStoreMenuOffering: (id: string) => api.delete<void>(`/admin/store-menu-offerings/${id}`),

  listStoreOperatingRules: () => listResource(['/admin/store-operating-rules'], ADMIN_STORES_FALLBACK_DATA.storeOperatingRules),
  createStoreOperatingRule: (assignmentId: string, body: Partial<StoreOperatingRule>) =>
    api.post<StoreOperatingRule>(`/admin/store-assignments/${assignmentId}/operating-rules`, body),
  patchStoreOperatingRule: (id: string, body: Partial<StoreOperatingRule>) =>
    api.patch<StoreOperatingRule>(`/admin/store-operating-rules/${id}`, body),
  deleteStoreOperatingRule: (id: string) => api.delete<void>(`/admin/store-operating-rules/${id}`),

  listStoreNotices: () => listResource(['/admin/store-notices'], ADMIN_STORES_FALLBACK_DATA.storeNotices),
  createStoreNotice: (body: Partial<StoreNotice>) => api.post<StoreNotice>('/admin/store-notices', body),
  patchStoreNotice: (id: string, body: Partial<StoreNotice>) => api.patch<StoreNotice>(`/admin/store-notices/${id}`, body),
  deleteStoreNotice: (id: string) => api.delete<void>(`/admin/store-notices/${id}`),
}
