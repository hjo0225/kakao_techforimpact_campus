import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPinned,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Store as StoreIcon,
  UtensilsCrossed,
} from 'lucide-react'
import {
  ADMIN_STORES_FALLBACK_DATA,
  adminStoresApi,
  loadAdminStoresDataset,
  type PolicyChoice,
  type StoreAssignment,
  type StoreMenuOffering,
  type StoreNotice,
  type StoreOperatingRule,
  type StoreSlot,
  type TenantMenuItem,
  type TenantStore,
  type VerificationStatus,
} from '../../../lib/adminStoresApi'
import { BottomNav } from '../BottomNav'
import { Button, Screen, ScreenHeader, ScrollArea } from '../design-system'

type TabId = 'slots' | 'stores' | 'assignments' | 'menu' | 'operations' | 'notices' | 'review'
type MenuView = 'items' | 'offerings'
type ReviewFilter = VerificationStatus | 'PRICE_MISSING' | 'POLICY_MISSING'
type WorkStatusFilter = 'ALL' | 'ACTIVE' | 'NEEDS_ATTENTION' | 'MISSING_MENU' | 'MISSING_POLICY'
type ResourceKey =
  | 'storeSlots'
  | 'tenantStores'
  | 'storeAssignments'
  | 'tenantMenuItems'
  | 'storeMenuOfferings'
  | 'storeOperatingRules'
  | 'storeNotices'

interface SaveFeedback {
  kind: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}

interface ReviewIssue {
  id: string
  entityId: string
  entityType: TabId | 'menu-items' | 'menu-offerings'
  title: string
  subtitle: string
  status: VerificationStatus
  filters: ReviewFilter[]
}

interface AssignmentWorkIssue {
  id: string
  label: string
  targetTab: TabId
  targetType?: 'slot' | 'store' | 'assignment' | 'offering' | 'rule'
  targetId?: string
  targetMenuView?: MenuView
}

interface AssignmentWorkRow {
  assignment: StoreAssignment
  slot: StoreSlot | null
  store: TenantStore | null
  offerings: StoreMenuOffering[]
  menuItems: TenantMenuItem[]
  rules: StoreOperatingRule[]
  notices: StoreNotice[]
  displayName: string
  slotLabel: string
  floor: string
  gateLabel: string
  searchText: string
  issues: AssignmentWorkIssue[]
  priceMissingCount: number
  policyMissingCount: number
  missingMenu: boolean
}

const TAB_ITEMS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'slots', label: '슬롯', icon: <MapPinned size={16} /> },
  { id: 'stores', label: '입점가게', icon: <StoreIcon size={16} /> },
  { id: 'assignments', label: '배정', icon: <ClipboardList size={16} /> },
  { id: 'menu', label: '메뉴', icon: <UtensilsCrossed size={16} /> },
  { id: 'operations', label: '영업', icon: <Clock3 size={16} /> },
  { id: 'notices', label: '공지', icon: <Bell size={16} /> },
  { id: 'review', label: '검수', icon: <ShieldCheck size={16} /> },
]

const REVIEW_FILTERS: Array<{ id: ReviewFilter; label: string }> = [
  { id: 'DRAFT', label: 'DRAFT' },
  { id: 'NEEDS_REVIEW', label: 'NEEDS_REVIEW' },
  { id: 'VERIFIED', label: 'VERIFIED' },
  { id: 'PRICE_MISSING', label: '가격 미입력' },
  { id: 'POLICY_MISSING', label: '정책 미확인' },
]

const WORK_STATUS_FILTERS: Array<{ id: WorkStatusFilter; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'ACTIVE', label: '운영 중' },
  { id: 'NEEDS_ATTENTION', label: '확인 필요' },
  { id: 'MISSING_MENU', label: '메뉴 없음' },
  { id: 'MISSING_POLICY', label: '용기 정책 미확인' },
]

const STATUS_TONES: Record<VerificationStatus, { bg: string; color: string; border: string }> = {
  DRAFT: { bg: '#FFF7ED', color: '#B45309', border: '#F59E0B' },
  NEEDS_REVIEW: { bg: '#FEF2F2', color: '#B91C1C', border: '#F87171' },
  VERIFIED: { bg: '#ECFDF5', color: '#047857', border: '#34D399' },
}

const ISSUE_TONE = { bg: '#FFF7ED', color: '#B45309', border: '#F59E0B' }
const RESOLVED_TONE = { bg: '#ECFDF5', color: '#047857', border: '#34D399' }
const NEUTRAL_TONE = { bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' }

const REVIEW_RESOURCE_LABELS: Record<ResourceKey, string> = {
  storeSlots: '슬롯',
  tenantStores: '입점가게',
  storeAssignments: '배정',
  tenantMenuItems: '기본 메뉴',
  storeMenuOfferings: '판매 메뉴',
  storeOperatingRules: '영업 규칙',
  storeNotices: '공지',
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}`
}

function nullIfBlank(value: string | null | undefined) {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

function parseOptionalNumber(value: string) {
  if (value.trim() === '') return null
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function replaceById<T extends { id: string }>(items: T[], nextItem: T) {
  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}

function mergeApiEntity<T extends { id: string }>(draft: T, payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return draft
  return { ...draft, ...(payload as Partial<T>) }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '알 수 없는 오류'
}

function isPolicyUnresolved(value: PolicyChoice) {
  return value === null || value === 'CHECK_ON_SITE'
}

function resolveOfferingPolicy(value: PolicyChoice, defaultValue: PolicyChoice) {
  return value === 'USE_DEFAULT' ? defaultValue : value
}

function hasOfferingPolicyIssue(offering: StoreMenuOffering, store: TenantStore | null) {
  return (
    isPolicyUnresolved(resolveOfferingPolicy(offering.usesReusableContainer, store?.defaultReusableContainerPolicy ?? null)) ||
    isPolicyUnresolved(resolveOfferingPolicy(offering.personalContainerAllowed, store?.defaultPersonalContainerPolicy ?? null))
  )
}

function hasMissingPrice(priceKrw: number | null, priceText: string | null) {
  return priceKrw === null && !priceText?.trim()
}

function floorSortValue(floor: string) {
  if (floor === '1F') return 10
  if (floor === '2F') return 20
  if (floor === '2.5F') return 25
  if (floor === '3F') return 30
  if (floor === '4F') return 40
  return 999
}

function formatPolicy(value: PolicyChoice) {
  if (value === 'USE_DEFAULT') return '기본값 사용'
  if (value === 'ALLOWED') return '가능'
  if (value === 'DISALLOWED') return '불가'
  if (value === 'CHECK_ON_SITE') return '현장 확인'
  return '미확인'
}

function formatSourceLabel(source: 'api' | 'fallback') {
  return source === 'api' ? 'API' : '샘플'
}

function formatFallbackReason(reason?: string) {
  if (!reason) return 'fallback'
  if (reason.includes('empty list')) return 'API 빈 응답'
  if (reason.includes('403')) return '관리자 권한 확인'
  if (reason.includes('401')) return '로그인 필요'
  return 'API 미연결'
}

function formatStatusLabel(value: VerificationStatus) {
  if (value === 'DRAFT') return 'DRAFT'
  if (value === 'NEEDS_REVIEW') return '검수 필요'
  return '검수 완료'
}

function formatPrice(priceKrw: number | null, priceText: string | null) {
  if (priceText) return priceText
  if (priceKrw === null) return '가격 미입력'
  return `${priceKrw.toLocaleString('ko-KR')}원`
}

function formatRuleLabel(rule: StoreOperatingRule) {
  if (rule.textOverride) return rule.textOverride
  if (rule.openTime && rule.closeTime) return `${rule.openTime}-${rule.closeTime}`
  return '운영 정보 미입력'
}

function createEmptySlot(): StoreSlot {
  return {
    id: nextId('slot-local'),
    stadiumCode: 'JAMSIL',
    floor: '2F',
    slotCode: 'JAMSIL-NEW',
    officialSlotNo: null,
    gate: null,
    category: 'OTHER',
    xPct: null,
    yPct: null,
    sectionHint: null,
    landmarkNote: null,
    isFoodMapVisible: true,
    isCodeProvisional: true,
    verificationStatus: 'DRAFT',
    sourceConfidence: 'LOW',
  }
}

function createEmptyStore(): TenantStore {
  return {
    id: nextId('tenant-local'),
    name: '새 입점가게',
    brandName: '',
    category: 'OTHER',
    description: null,
    defaultHoursText: null,
    defaultReusableContainerPolicy: null,
    defaultPersonalContainerPolicy: null,
    verificationStatus: 'DRAFT',
  }
}

function createEmptyAssignment(slotId: string, tenantStoreId: string): StoreAssignment {
  return {
    id: nextId('assignment-local'),
    slotId,
    tenantStoreId,
    seasonYear: 2026,
    status: 'PLANNED',
    displayNameOverride: null,
    hoursText: null,
    publicNote: null,
    verificationStatus: 'DRAFT',
  }
}

function createEmptyMenuItem(tenantStoreId: string): TenantMenuItem {
  return {
    id: nextId('menu-local'),
    tenantStoreId,
    name: '신규 메뉴',
    category: 'MAIN',
    description: null,
    basePriceKrw: null,
    basePriceText: null,
    isActive: true,
    isSignature: false,
    verificationStatus: 'DRAFT',
  }
}

function createEmptyOffering(assignmentId: string, menuItemId: string): StoreMenuOffering {
  return {
    id: nextId('offering-local'),
    assignmentId,
    menuItemId,
    priceKrw: null,
    priceText: null,
    saleStatus: 'ON_SALE',
    sortOrder: 1,
    note: null,
    usesReusableContainer: 'USE_DEFAULT',
    personalContainerAllowed: 'USE_DEFAULT',
    verificationStatus: 'DRAFT',
  }
}

function createEmptyRule(assignmentId: string): StoreOperatingRule {
  return {
    id: nextId('rule-local'),
    assignmentId,
    ruleType: 'TEXT_ONLY',
    isActive: true,
    openTime: null,
    closeTime: null,
    textOverride: null,
    verificationStatus: 'DRAFT',
  }
}

function createEmptyNotice(): StoreNotice {
  return {
    id: nextId('notice-local'),
    title: '새 공지',
    body: '',
    noticeType: 'GENERAL',
    isPublic: false,
    slotId: null,
    tenantStoreId: null,
    assignmentId: null,
    verificationStatus: 'DRAFT',
  }
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className="cb-card"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#111827' }}>{title}</h3>
          {description && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Badge({
  children,
  tone = { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
}: {
  children: ReactNode
  tone?: { bg: string; color: string; border: string }
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background: tone.bg,
        color: tone.color,
        border: `1.5px solid ${tone.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#374151' }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 11, color: '#6B7280' }}>{hint}</span> : null}
    </label>
  )
}

function inputStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: '100%',
    minHeight: 44,
    padding: '11px 12px',
    borderRadius: 12,
    border: '1.5px solid #D1D5DB',
    background: '#FFF',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    ...extra,
  }
}

function StatusNote({ state }: { state: SaveFeedback }) {
  if (state.kind === 'idle') return null

  const tone =
    state.kind === 'success'
      ? { bg: '#ECFDF5', color: '#047857', border: '#34D399' }
      : state.kind === 'error'
        ? { bg: '#FEF2F2', color: '#B91C1C', border: '#F87171' }
        : { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' }

  return <Badge tone={tone}>{state.message ?? ''}</Badge>
}

function ListButton({
  active,
  title,
  subtitle,
  meta,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  meta?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 14,
        border: active ? '2px solid #C85C77' : '1.5px solid #E5E7EB',
        background: active ? '#FFF0F3' : '#FFF',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#111827',
            lineHeight: 1.4,
            wordBreak: 'keep-all',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 12,
            color: '#6B7280',
            lineHeight: 1.45,
            wordBreak: 'keep-all',
            overflowWrap: 'anywhere',
          }}
        >
          {subtitle}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {meta}
        <ChevronRight size={16} color="#9CA3AF" />
      </div>
    </button>
  )
}

export function AdminStoresScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('review')
  const [menuView, setMenuView] = useState<MenuView>('items')
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('NEEDS_REVIEW')
  const [workQuery, setWorkQuery] = useState('')
  const [workFloor, setWorkFloor] = useState('ALL')
  const [workStatusFilter, setWorkStatusFilter] = useState<WorkStatusFilter>('NEEDS_ATTENTION')
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)

  const [storeSlots, setStoreSlots] = useState<StoreSlot[]>(ADMIN_STORES_FALLBACK_DATA.storeSlots)
  const [tenantStores, setTenantStores] = useState<TenantStore[]>(ADMIN_STORES_FALLBACK_DATA.tenantStores)
  const [storeAssignments, setStoreAssignments] = useState<StoreAssignment[]>(ADMIN_STORES_FALLBACK_DATA.storeAssignments)
  const [tenantMenuItems, setTenantMenuItems] = useState<TenantMenuItem[]>(ADMIN_STORES_FALLBACK_DATA.tenantMenuItems)
  const [storeMenuOfferings, setStoreMenuOfferings] = useState<StoreMenuOffering[]>(ADMIN_STORES_FALLBACK_DATA.storeMenuOfferings)
  const [storeOperatingRules, setStoreOperatingRules] = useState<StoreOperatingRule[]>(ADMIN_STORES_FALLBACK_DATA.storeOperatingRules)
  const [storeNotices, setStoreNotices] = useState<StoreNotice[]>(ADMIN_STORES_FALLBACK_DATA.storeNotices)

  const [sources, setSources] = useState<Record<ResourceKey, 'api' | 'fallback'>>({
    storeSlots: 'fallback',
    tenantStores: 'fallback',
    storeAssignments: 'fallback',
    tenantMenuItems: 'fallback',
    storeMenuOfferings: 'fallback',
    storeOperatingRules: 'fallback',
    storeNotices: 'fallback',
  })
  const [errors, setErrors] = useState<Partial<Record<ResourceKey, string>>>({})

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.storeSlots[0]?.id ?? null)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.tenantStores[0]?.id ?? null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.storeAssignments[0]?.id ?? null)
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.tenantMenuItems[0]?.id ?? null)
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.storeMenuOfferings[0]?.id ?? null)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.storeOperatingRules[0]?.id ?? null)
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(ADMIN_STORES_FALLBACK_DATA.storeNotices[0]?.id ?? null)

  const [slotDraft, setSlotDraft] = useState<StoreSlot>(ADMIN_STORES_FALLBACK_DATA.storeSlots[0] ?? createEmptySlot())
  const [storeDraft, setStoreDraft] = useState<TenantStore>(ADMIN_STORES_FALLBACK_DATA.tenantStores[0] ?? createEmptyStore())
  const [assignmentDraft, setAssignmentDraft] = useState<StoreAssignment>(
    ADMIN_STORES_FALLBACK_DATA.storeAssignments[0] ??
      createEmptyAssignment(ADMIN_STORES_FALLBACK_DATA.storeSlots[0]?.id ?? '', ADMIN_STORES_FALLBACK_DATA.tenantStores[0]?.id ?? ''),
  )
  const [menuItemDraft, setMenuItemDraft] = useState<TenantMenuItem>(
    ADMIN_STORES_FALLBACK_DATA.tenantMenuItems[0] ?? createEmptyMenuItem(ADMIN_STORES_FALLBACK_DATA.tenantStores[0]?.id ?? ''),
  )
  const [offeringDraft, setOfferingDraft] = useState<StoreMenuOffering>(
    ADMIN_STORES_FALLBACK_DATA.storeMenuOfferings[0] ??
      createEmptyOffering(
        ADMIN_STORES_FALLBACK_DATA.storeAssignments[0]?.id ?? '',
        ADMIN_STORES_FALLBACK_DATA.tenantMenuItems[0]?.id ?? '',
      ),
  )
  const [ruleDraft, setRuleDraft] = useState<StoreOperatingRule>(
    ADMIN_STORES_FALLBACK_DATA.storeOperatingRules[0] ?? createEmptyRule(ADMIN_STORES_FALLBACK_DATA.storeAssignments[0]?.id ?? ''),
  )
  const [noticeDraft, setNoticeDraft] = useState<StoreNotice>(ADMIN_STORES_FALLBACK_DATA.storeNotices[0] ?? createEmptyNotice())

  const [slotSaveState, setSlotSaveState] = useState<SaveFeedback>({ kind: 'idle' })
  const [storeSaveState, setStoreSaveState] = useState<SaveFeedback>({ kind: 'idle' })
  const [assignmentSaveState, setAssignmentSaveState] = useState<SaveFeedback>({ kind: 'idle' })
  const [menuItemSaveState, setMenuItemSaveState] = useState<SaveFeedback>({ kind: 'idle' })
  const [offeringSaveState, setOfferingSaveState] = useState<SaveFeedback>({ kind: 'idle' })
  const [ruleSaveState, setRuleSaveState] = useState<SaveFeedback>({ kind: 'idle' })
  const [noticeSaveState, setNoticeSaveState] = useState<SaveFeedback>({ kind: 'idle' })

  const loadAdminData = useCallback(async () => {
    setLoadState('loading')
    const dataset = await loadAdminStoresDataset()
    setStoreSlots(dataset.storeSlots.items)
    setTenantStores(dataset.tenantStores.items)
    setStoreAssignments(dataset.storeAssignments.items)
    setTenantMenuItems(dataset.tenantMenuItems.items)
    setStoreMenuOfferings(dataset.storeMenuOfferings.items)
    setStoreOperatingRules(dataset.storeOperatingRules.items)
    setStoreNotices(dataset.storeNotices.items)
    setSources({
      storeSlots: dataset.storeSlots.source,
      tenantStores: dataset.tenantStores.source,
      storeAssignments: dataset.storeAssignments.source,
      tenantMenuItems: dataset.tenantMenuItems.source,
      storeMenuOfferings: dataset.storeMenuOfferings.source,
      storeOperatingRules: dataset.storeOperatingRules.source,
      storeNotices: dataset.storeNotices.source,
    })
    setErrors({
      storeSlots: dataset.storeSlots.error,
      tenantStores: dataset.tenantStores.error,
      storeAssignments: dataset.storeAssignments.error,
      tenantMenuItems: dataset.tenantMenuItems.error,
      storeMenuOfferings: dataset.storeMenuOfferings.error,
      storeOperatingRules: dataset.storeOperatingRules.error,
      storeNotices: dataset.storeNotices.error,
    })
    setLastLoadedAt(
      new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    )
    setLoadState('ready')
  }, [])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const slotById = useMemo(() => new Map(storeSlots.map((item) => [item.id, item])), [storeSlots])
  const storeById = useMemo(() => new Map(tenantStores.map((item) => [item.id, item])), [tenantStores])
  const assignmentById = useMemo(() => new Map(storeAssignments.map((item) => [item.id, item])), [storeAssignments])
  const menuItemById = useMemo(() => new Map(tenantMenuItems.map((item) => [item.id, item])), [tenantMenuItems])

  const selectedSlot = useMemo(
    () => storeSlots.find((item) => item.id === selectedSlotId) ?? null,
    [storeSlots, selectedSlotId],
  )
  const selectedStore = useMemo(
    () => tenantStores.find((item) => item.id === selectedStoreId) ?? null,
    [tenantStores, selectedStoreId],
  )
  const selectedAssignment = useMemo(
    () => storeAssignments.find((item) => item.id === selectedAssignmentId) ?? null,
    [storeAssignments, selectedAssignmentId],
  )
  const selectedMenuItem = useMemo(
    () => tenantMenuItems.find((item) => item.id === selectedMenuItemId) ?? null,
    [tenantMenuItems, selectedMenuItemId],
  )
  const selectedOffering = useMemo(
    () => storeMenuOfferings.find((item) => item.id === selectedOfferingId) ?? null,
    [storeMenuOfferings, selectedOfferingId],
  )
  const selectedRule = useMemo(
    () => storeOperatingRules.find((item) => item.id === selectedRuleId) ?? null,
    [storeOperatingRules, selectedRuleId],
  )
  const selectedNotice = useMemo(
    () => storeNotices.find((item) => item.id === selectedNoticeId) ?? null,
    [storeNotices, selectedNoticeId],
  )

  useEffect(() => {
    if (!selectedSlotId || !storeSlots.some((item) => item.id === selectedSlotId)) {
      setSelectedSlotId(storeSlots[0]?.id ?? null)
    }
  }, [storeSlots, selectedSlotId])

  useEffect(() => {
    if (!selectedStoreId || !tenantStores.some((item) => item.id === selectedStoreId)) {
      setSelectedStoreId(tenantStores[0]?.id ?? null)
    }
  }, [tenantStores, selectedStoreId])

  useEffect(() => {
    if (!selectedAssignmentId || !storeAssignments.some((item) => item.id === selectedAssignmentId)) {
      setSelectedAssignmentId(storeAssignments[0]?.id ?? null)
    }
  }, [storeAssignments, selectedAssignmentId])

  useEffect(() => {
    if (!selectedMenuItemId || !tenantMenuItems.some((item) => item.id === selectedMenuItemId)) {
      setSelectedMenuItemId(tenantMenuItems[0]?.id ?? null)
    }
  }, [tenantMenuItems, selectedMenuItemId])

  useEffect(() => {
    if (!selectedOfferingId || !storeMenuOfferings.some((item) => item.id === selectedOfferingId)) {
      setSelectedOfferingId(storeMenuOfferings[0]?.id ?? null)
    }
  }, [storeMenuOfferings, selectedOfferingId])

  useEffect(() => {
    if (!selectedRuleId || !storeOperatingRules.some((item) => item.id === selectedRuleId)) {
      setSelectedRuleId(storeOperatingRules[0]?.id ?? null)
    }
  }, [storeOperatingRules, selectedRuleId])

  useEffect(() => {
    if (!selectedNoticeId || !storeNotices.some((item) => item.id === selectedNoticeId)) {
      setSelectedNoticeId(storeNotices[0]?.id ?? null)
    }
  }, [storeNotices, selectedNoticeId])

  useEffect(() => {
    if (selectedSlot) setSlotDraft(selectedSlot)
  }, [selectedSlot])

  useEffect(() => {
    if (selectedStore) setStoreDraft(selectedStore)
  }, [selectedStore])

  useEffect(() => {
    if (selectedAssignment) setAssignmentDraft(selectedAssignment)
  }, [selectedAssignment])

  useEffect(() => {
    if (selectedMenuItem) setMenuItemDraft(selectedMenuItem)
  }, [selectedMenuItem])

  useEffect(() => {
    if (selectedOffering) setOfferingDraft(selectedOffering)
  }, [selectedOffering])

  useEffect(() => {
    if (selectedRule) setRuleDraft(selectedRule)
  }, [selectedRule])

  useEffect(() => {
    if (selectedNotice) setNoticeDraft(selectedNotice)
  }, [selectedNotice])

  const fallbackResources = useMemo(
    () => (Object.keys(sources) as ResourceKey[]).filter((key) => sources[key] === 'fallback'),
    [sources],
  )

  const formatSlotLabel = useCallback((slotId: string) => {
    const slot = slotById.get(slotId)
    if (!slot) return '미지정 슬롯'
    return `${slot.floor} · ${slot.slotCode}${slot.officialSlotNo ? ` (${slot.officialSlotNo})` : ''}`
  }, [slotById])

  const formatStoreLabel = useCallback((storeId: string) => {
    const store = storeById.get(storeId)
    if (!store) return '미지정 가게'
    return store.name
  }, [storeById])

  const formatAssignmentLabel = useCallback((assignmentId: string) => {
    const assignment = assignmentById.get(assignmentId)
    if (!assignment) return '미지정 배정'
    const storeName = formatStoreLabel(assignment.tenantStoreId)
    const slotLabel = formatSlotLabel(assignment.slotId)
    return `${storeName} · ${slotLabel}`
  }, [assignmentById, formatSlotLabel, formatStoreLabel])

  const assignmentRows = useMemo<AssignmentWorkRow[]>(() => {
    return storeAssignments.map((assignment) => {
      const slot = slotById.get(assignment.slotId) ?? null
      const store = storeById.get(assignment.tenantStoreId) ?? null
      const offerings = storeMenuOfferings
        .filter((offering) => offering.assignmentId === assignment.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const menuItems = offerings
        .map((offering) => menuItemById.get(offering.menuItemId))
        .filter((item): item is TenantMenuItem => Boolean(item))
      const rules = storeOperatingRules.filter((rule) => rule.assignmentId === assignment.id)
      const notices = storeNotices.filter(
        (notice) =>
          notice.assignmentId === assignment.id ||
          notice.slotId === assignment.slotId ||
          notice.tenantStoreId === assignment.tenantStoreId,
      )
      const issues: AssignmentWorkIssue[] = []
      const priceMissingCount = offerings.filter((offering) => hasMissingPrice(offering.priceKrw, offering.priceText)).length
      const policyMissingCount = offerings.filter((offering) => hasOfferingPolicyIssue(offering, store)).length
      const hasActiveRule = rules.some((rule) => rule.isActive && (rule.textOverride || (rule.openTime && rule.closeTime)))

      if (!slot) {
        issues.push({ id: 'slot-missing', label: '슬롯 연결 없음', targetTab: 'assignments', targetType: 'assignment' })
      } else if (slot.verificationStatus !== 'VERIFIED') {
        issues.push({ id: 'slot-review', label: '슬롯 검수 필요', targetTab: 'slots', targetType: 'slot', targetId: slot.id })
      }

      if (!store) {
        issues.push({ id: 'store-missing', label: '가게 연결 없음', targetTab: 'assignments', targetType: 'assignment' })
      } else {
        if (store.verificationStatus !== 'VERIFIED') {
          issues.push({ id: 'store-review', label: '가게 검수 필요', targetTab: 'stores', targetType: 'store', targetId: store.id })
        }
        if (isPolicyUnresolved(store.defaultReusableContainerPolicy) || isPolicyUnresolved(store.defaultPersonalContainerPolicy)) {
          issues.push({ id: 'store-policy', label: '기본 용기 정책 미확인', targetTab: 'stores', targetType: 'store', targetId: store.id })
        }
      }

      if (assignment.verificationStatus !== 'VERIFIED') {
        issues.push({
          id: 'assignment-review',
          label: '배정 검수 필요',
          targetTab: 'assignments',
          targetType: 'assignment',
          targetId: assignment.id,
        })
      }

      if (!assignment.hoursText && !hasActiveRule) {
        issues.push({ id: 'hours-missing', label: '영업시간 미입력', targetTab: 'operations', targetType: 'rule', targetId: rules[0]?.id })
      }

      if (offerings.length === 0) {
        issues.push({ id: 'menu-missing', label: '판매 메뉴 없음', targetTab: 'menu', targetMenuView: 'offerings' })
      }
      if (priceMissingCount > 0) {
        issues.push({
          id: 'price-missing',
          label: `가격 ${priceMissingCount}건 미입력`,
          targetTab: 'menu',
          targetType: 'offering',
          targetMenuView: 'offerings',
          targetId: offerings.find((offering) => hasMissingPrice(offering.priceKrw, offering.priceText))?.id,
        })
      }
      if (policyMissingCount > 0) {
        issues.push({
          id: 'policy-missing',
          label: `용기 정책 ${policyMissingCount}건 미확인`,
          targetTab: 'menu',
          targetType: 'offering',
          targetMenuView: 'offerings',
          targetId: offerings.find((offering) => hasOfferingPolicyIssue(offering, store))?.id,
        })
      }

      const displayName = assignment.displayNameOverride || store?.name || '미지정 가게'
      const slotLabel = slot
        ? `${slot.floor} · ${slot.officialSlotNo ?? slot.slotCode}${slot.isCodeProvisional ? ' · 임시코드' : ''}`
        : '미지정 슬롯'
      const gateLabel = slot?.gate ?? slot?.sectionHint ?? '위치 힌트 없음'
      const searchText = [
        displayName,
        store?.brandName,
        store?.category,
        slot?.floor,
        slot?.slotCode,
        slot?.officialSlotNo,
        slot?.gate,
        slot?.sectionHint,
        assignment.hoursText,
        ...menuItems.map((item) => item.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ko-KR')

      return {
        assignment,
        slot,
        store,
        offerings,
        menuItems,
        rules,
        notices,
        displayName,
        slotLabel,
        floor: slot?.floor ?? '미지정',
        gateLabel,
        searchText,
        issues,
        priceMissingCount,
        policyMissingCount,
        missingMenu: offerings.length === 0,
      }
    })
  }, [
    storeAssignments,
    slotById,
    storeById,
    storeMenuOfferings,
    menuItemById,
    storeOperatingRules,
    storeNotices,
  ])

  const workFloors = useMemo(
    () => [
      'ALL',
      ...Array.from(new Set(assignmentRows.map((row) => row.floor).filter((floor) => floor !== '미지정'))).sort(
        (a, b) => floorSortValue(a) - floorSortValue(b),
      ),
    ],
    [assignmentRows],
  )

  const filteredAssignmentRows = useMemo(() => {
    const query = workQuery.trim().toLocaleLowerCase('ko-KR')
    return assignmentRows.filter((row) => {
      if (workFloor !== 'ALL' && row.floor !== workFloor) return false
      if (query && !row.searchText.includes(query)) return false

      if (workStatusFilter === 'ACTIVE') return row.assignment.status === 'ACTIVE'
      if (workStatusFilter === 'NEEDS_ATTENTION') return row.issues.length > 0
      if (workStatusFilter === 'MISSING_MENU') return row.missingMenu
      if (workStatusFilter === 'MISSING_POLICY') return row.policyMissingCount > 0
      return true
    })
  }, [assignmentRows, workFloor, workQuery, workStatusFilter])

  const selectedAssignmentRow = useMemo(
    () => assignmentRows.find((row) => row.assignment.id === selectedAssignmentId) ?? null,
    [assignmentRows, selectedAssignmentId],
  )

  const workStats = useMemo(
    () => ({
      active: assignmentRows.filter((row) => row.assignment.status === 'ACTIVE').length,
      needsAttention: assignmentRows.filter((row) => row.issues.length > 0).length,
      missingMenu: assignmentRows.filter((row) => row.missingMenu).length,
      missingPolicy: assignmentRows.filter((row) => row.policyMissingCount > 0).length,
      missingPrice: assignmentRows.filter((row) => row.priceMissingCount > 0).length,
    }),
    [assignmentRows],
  )

  const focusAssignmentRow = useCallback((row: AssignmentWorkRow, nextTab?: TabId, nextMenuView?: MenuView) => {
    setSelectedAssignmentId(row.assignment.id)
    if (row.slot) setSelectedSlotId(row.slot.id)
    if (row.store) setSelectedStoreId(row.store.id)
    if (row.offerings[0]) setSelectedOfferingId(row.offerings[0].id)
    if (row.menuItems[0]) setSelectedMenuItemId(row.menuItems[0].id)
    if (row.rules[0]) setSelectedRuleId(row.rules[0].id)
    if (row.notices[0]) setSelectedNoticeId(row.notices[0].id)
    if (nextMenuView) setMenuView(nextMenuView)
    if (nextTab) setActiveTab(nextTab)
  }, [])

  const openWorkIssue = useCallback(
    (row: AssignmentWorkRow, issue: AssignmentWorkIssue) => {
      focusAssignmentRow(row, issue.targetTab, issue.targetMenuView)

      if (issue.targetType === 'slot' && issue.targetId) setSelectedSlotId(issue.targetId)
      if (issue.targetType === 'store' && issue.targetId) setSelectedStoreId(issue.targetId)
      if (issue.targetType === 'assignment') setSelectedAssignmentId(issue.targetId ?? row.assignment.id)
      if (issue.targetType === 'offering' && issue.targetId) setSelectedOfferingId(issue.targetId)
      if (issue.targetType === 'rule' && issue.targetId) setSelectedRuleId(issue.targetId)
    },
    [focusAssignmentRow],
  )

  const visibleMenuItems = useMemo(
    () => (selectedStoreId ? tenantMenuItems.filter((item) => item.tenantStoreId === selectedStoreId) : tenantMenuItems),
    [selectedStoreId, tenantMenuItems],
  )

  const visibleOfferings = useMemo(
    () =>
      selectedAssignmentId
        ? storeMenuOfferings.filter((offering) => offering.assignmentId === selectedAssignmentId)
        : storeMenuOfferings,
    [selectedAssignmentId, storeMenuOfferings],
  )

  const visibleOperatingRules = useMemo(
    () => (selectedAssignmentId ? storeOperatingRules.filter((rule) => rule.assignmentId === selectedAssignmentId) : storeOperatingRules),
    [selectedAssignmentId, storeOperatingRules],
  )

  const visibleNotices = useMemo(() => {
    if (!selectedAssignment) return storeNotices
    return storeNotices.filter(
      (notice) =>
        notice.assignmentId === selectedAssignment.id ||
        notice.slotId === selectedAssignment.slotId ||
        notice.tenantStoreId === selectedAssignment.tenantStoreId,
    )
  }, [selectedAssignment, storeNotices])

  const reviewItems = useMemo<ReviewIssue[]>(() => {
    const items: ReviewIssue[] = []

    storeSlots.forEach((slot) => {
      items.push({
        id: `slot-${slot.id}`,
        entityId: slot.id,
        entityType: 'slots',
        title: slot.slotCode,
        subtitle: `${slot.floor} · ${slot.category} · ${slot.sectionHint ?? '구역 미입력'}`,
        status: slot.verificationStatus,
        filters: [slot.verificationStatus],
      })
    })

    tenantStores.forEach((store) => {
      const filters: ReviewFilter[] = [store.verificationStatus]
      if (isPolicyUnresolved(store.defaultReusableContainerPolicy) || isPolicyUnresolved(store.defaultPersonalContainerPolicy)) {
        filters.push('POLICY_MISSING')
      }
      items.push({
        id: `store-${store.id}`,
        entityId: store.id,
        entityType: 'stores',
        title: store.name,
        subtitle: `${store.category} · ${formatPolicy(store.defaultReusableContainerPolicy)} / ${formatPolicy(store.defaultPersonalContainerPolicy)}`,
        status: store.verificationStatus,
        filters,
      })
    })

    storeAssignments.forEach((assignment) => {
      items.push({
        id: `assignment-${assignment.id}`,
        entityId: assignment.id,
        entityType: 'assignments',
        title: formatAssignmentLabel(assignment.id),
        subtitle: assignment.hoursText ?? '운영시간 미입력',
        status: assignment.verificationStatus,
        filters: [assignment.verificationStatus],
      })
    })

    tenantMenuItems.forEach((item) => {
      const filters: ReviewFilter[] = [item.verificationStatus]
      if (hasMissingPrice(item.basePriceKrw, item.basePriceText)) filters.push('PRICE_MISSING')
      items.push({
        id: `menu-item-${item.id}`,
        entityId: item.id,
        entityType: 'menu-items',
        title: item.name,
        subtitle: `${formatStoreLabel(item.tenantStoreId)} · ${formatPrice(item.basePriceKrw, item.basePriceText)}`,
        status: item.verificationStatus,
        filters,
      })
    })

    storeMenuOfferings.forEach((offering) => {
      const filters: ReviewFilter[] = [offering.verificationStatus]
      const assignment = assignmentById.get(offering.assignmentId)
      const store = assignment ? storeById.get(assignment.tenantStoreId) ?? null : null
      if (hasMissingPrice(offering.priceKrw, offering.priceText)) filters.push('PRICE_MISSING')
      if (hasOfferingPolicyIssue(offering, store)) filters.push('POLICY_MISSING')
      items.push({
        id: `offering-${offering.id}`,
        entityId: offering.id,
        entityType: 'menu-offerings',
        title: menuItemById.get(offering.menuItemId)?.name ?? '미지정 메뉴',
        subtitle: `${formatAssignmentLabel(offering.assignmentId)} · ${formatPrice(offering.priceKrw, offering.priceText)}`,
        status: offering.verificationStatus,
        filters,
      })
    })

    storeOperatingRules.forEach((rule) => {
      items.push({
        id: `rule-${rule.id}`,
        entityId: rule.id,
        entityType: 'operations',
        title: formatAssignmentLabel(rule.assignmentId),
        subtitle: formatRuleLabel(rule),
        status: rule.verificationStatus,
        filters: [rule.verificationStatus],
      })
    })

    storeNotices.forEach((notice) => {
      items.push({
        id: `notice-${notice.id}`,
        entityId: notice.id,
        entityType: 'notices',
        title: notice.title,
        subtitle: `${notice.noticeType} · ${notice.isPublic ? '공개' : '내부'} 공지`,
        status: notice.verificationStatus,
        filters: [notice.verificationStatus],
      })
    })

    return items
  }, [
    storeSlots,
    tenantStores,
    storeAssignments,
    tenantMenuItems,
    storeMenuOfferings,
    storeOperatingRules,
    storeNotices,
    formatAssignmentLabel,
    formatStoreLabel,
    assignmentById,
    storeById,
    menuItemById,
  ])

  const filteredReviewItems = useMemo(
    () => reviewItems.filter((item) => item.filters.includes(reviewFilter)),
    [reviewItems, reviewFilter],
  )

  const filterCounts = useMemo(
    () =>
      REVIEW_FILTERS.reduce<Record<ReviewFilter, number>>((acc, filter) => {
        acc[filter.id] = reviewItems.filter((item) => item.filters.includes(filter.id)).length
        return acc
      }, {} as Record<ReviewFilter, number>),
    [reviewItems],
  )

  const jumpToIssue = useCallback((issue: ReviewIssue) => {
    if (issue.entityType === 'menu-items') {
      setActiveTab('menu')
      setMenuView('items')
      setSelectedMenuItemId(issue.entityId)
      return
    }
    if (issue.entityType === 'menu-offerings') {
      setActiveTab('menu')
      setMenuView('offerings')
      setSelectedOfferingId(issue.entityId)
      return
    }

    setActiveTab(issue.entityType)

    if (issue.entityType === 'slots') setSelectedSlotId(issue.entityId)
    if (issue.entityType === 'stores') setSelectedStoreId(issue.entityId)
    if (issue.entityType === 'assignments') setSelectedAssignmentId(issue.entityId)
    if (issue.entityType === 'operations') setSelectedRuleId(issue.entityId)
    if (issue.entityType === 'notices') setSelectedNoticeId(issue.entityId)
  }, [])

  const handleCreateSlot = async () => {
    const draft = createEmptySlot()
    setSlotSaveState({ kind: 'saving', message: '슬롯 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createStoreSlot(draft))
      setStoreSlots((prev) => [saved, ...prev])
      setSelectedSlotId(saved.id)
      setSlotSaveState({ kind: 'success', message: '슬롯을 추가했습니다.' })
    } catch (error) {
      setStoreSlots((prev) => [draft, ...prev])
      setSelectedSlotId(draft.id)
      setSlotSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveSlot = async () => {
    if (!selectedSlot) return
    const nextSlot = {
      ...slotDraft,
      officialSlotNo: nullIfBlank(slotDraft.officialSlotNo),
      gate: nullIfBlank(slotDraft.gate),
      sectionHint: nullIfBlank(slotDraft.sectionHint),
      landmarkNote: nullIfBlank(slotDraft.landmarkNote),
    }
    setSlotSaveState({ kind: 'saving', message: '슬롯 저장 중...' })
    try {
      const saved = mergeApiEntity(nextSlot, await adminStoresApi.patchStoreSlot(nextSlot.id, nextSlot))
      setStoreSlots((prev) => replaceById(prev, saved))
      setSlotSaveState({ kind: 'success', message: '슬롯을 저장했습니다.' })
    } catch (error) {
      setStoreSlots((prev) => replaceById(prev, nextSlot))
      setSlotSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const handleCreateStore = async () => {
    const draft = createEmptyStore()
    setStoreSaveState({ kind: 'saving', message: '입점가게 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createTenantStore(draft))
      setTenantStores((prev) => [saved, ...prev])
      setSelectedStoreId(saved.id)
      setStoreSaveState({ kind: 'success', message: '입점가게를 추가했습니다.' })
    } catch (error) {
      setTenantStores((prev) => [draft, ...prev])
      setSelectedStoreId(draft.id)
      setStoreSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveStore = async () => {
    if (!selectedStore) return
    const nextStore = {
      ...storeDraft,
      brandName: storeDraft.brandName.trim(),
      description: nullIfBlank(storeDraft.description),
      defaultHoursText: nullIfBlank(storeDraft.defaultHoursText),
    }
    setStoreSaveState({ kind: 'saving', message: '입점가게 저장 중...' })
    try {
      const saved = mergeApiEntity(nextStore, await adminStoresApi.patchTenantStore(nextStore.id, nextStore))
      setTenantStores((prev) => replaceById(prev, saved))
      setStoreSaveState({ kind: 'success', message: '입점가게를 저장했습니다.' })
    } catch (error) {
      setTenantStores((prev) => replaceById(prev, nextStore))
      setStoreSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const handleCreateAssignment = async () => {
    if (!storeSlots[0] || !tenantStores[0]) return
    const draft = createEmptyAssignment(storeSlots[0].id, tenantStores[0].id)
    setAssignmentSaveState({ kind: 'saving', message: '배정 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createStoreAssignment(draft))
      setStoreAssignments((prev) => [saved, ...prev])
      setSelectedAssignmentId(saved.id)
      setAssignmentSaveState({ kind: 'success', message: '배정을 추가했습니다.' })
    } catch (error) {
      setStoreAssignments((prev) => [draft, ...prev])
      setSelectedAssignmentId(draft.id)
      setAssignmentSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveAssignment = async () => {
    if (!selectedAssignment) return
    const nextAssignment = {
      ...assignmentDraft,
      displayNameOverride: nullIfBlank(assignmentDraft.displayNameOverride),
      hoursText: nullIfBlank(assignmentDraft.hoursText),
      publicNote: nullIfBlank(assignmentDraft.publicNote),
    }
    setAssignmentSaveState({ kind: 'saving', message: '배정 저장 중...' })
    try {
      const saved = mergeApiEntity(nextAssignment, await adminStoresApi.patchStoreAssignment(nextAssignment.id, nextAssignment))
      setStoreAssignments((prev) => replaceById(prev, saved))
      setAssignmentSaveState({ kind: 'success', message: '배정을 저장했습니다.' })
    } catch (error) {
      setStoreAssignments((prev) => replaceById(prev, nextAssignment))
      setAssignmentSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const handleCreateMenuItem = async () => {
    const tenantStoreId = selectedStoreId ?? tenantStores[0]?.id
    if (!tenantStoreId) return
    const draft = createEmptyMenuItem(tenantStoreId)
    setMenuItemSaveState({ kind: 'saving', message: '기본 메뉴 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createTenantMenuItem(tenantStoreId, draft))
      setTenantMenuItems((prev) => [saved, ...prev])
      setSelectedMenuItemId(saved.id)
      setMenuItemSaveState({ kind: 'success', message: '기본 메뉴를 추가했습니다.' })
    } catch (error) {
      setTenantMenuItems((prev) => [draft, ...prev])
      setSelectedMenuItemId(draft.id)
      setMenuItemSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveMenuItem = async () => {
    if (!selectedMenuItem) return
    const nextItem = {
      ...menuItemDraft,
      description: nullIfBlank(menuItemDraft.description),
      basePriceText: nullIfBlank(menuItemDraft.basePriceText),
    }
    setMenuItemSaveState({ kind: 'saving', message: '기본 메뉴 저장 중...' })
    try {
      const saved = mergeApiEntity(nextItem, await adminStoresApi.patchTenantMenuItem(nextItem.id, nextItem))
      setTenantMenuItems((prev) => replaceById(prev, saved))
      setMenuItemSaveState({ kind: 'success', message: '기본 메뉴를 저장했습니다.' })
    } catch (error) {
      setTenantMenuItems((prev) => replaceById(prev, nextItem))
      setMenuItemSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const handleCreateOffering = async () => {
    const assignmentId = selectedAssignmentId ?? storeAssignments[0]?.id
    const menuItemId =
      selectedMenuItemId && visibleMenuItems.some((item) => item.id === selectedMenuItemId)
        ? selectedMenuItemId
        : visibleMenuItems[0]?.id ?? tenantMenuItems[0]?.id
    if (!assignmentId || !menuItemId) return
    const draft = createEmptyOffering(assignmentId, menuItemId)
    setOfferingSaveState({ kind: 'saving', message: '판매 메뉴 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createStoreMenuOffering(assignmentId, draft))
      setStoreMenuOfferings((prev) => [saved, ...prev])
      setSelectedOfferingId(saved.id)
      setOfferingSaveState({ kind: 'success', message: '판매 메뉴를 추가했습니다.' })
    } catch (error) {
      setStoreMenuOfferings((prev) => [draft, ...prev])
      setSelectedOfferingId(draft.id)
      setOfferingSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveOffering = async () => {
    if (!selectedOffering) return
    const nextOffering = {
      ...offeringDraft,
      priceText: nullIfBlank(offeringDraft.priceText),
      note: nullIfBlank(offeringDraft.note),
    }
    setOfferingSaveState({ kind: 'saving', message: '판매 메뉴 저장 중...' })
    try {
      const saved = mergeApiEntity(nextOffering, await adminStoresApi.patchStoreMenuOffering(nextOffering.id, nextOffering))
      setStoreMenuOfferings((prev) => replaceById(prev, saved))
      setOfferingSaveState({ kind: 'success', message: '판매 메뉴를 저장했습니다.' })
    } catch (error) {
      setStoreMenuOfferings((prev) => replaceById(prev, nextOffering))
      setOfferingSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const handleCreateRule = async () => {
    const assignmentId = selectedAssignmentId ?? storeAssignments[0]?.id
    if (!assignmentId) return
    const draft = createEmptyRule(assignmentId)
    setRuleSaveState({ kind: 'saving', message: '영업 규칙 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createStoreOperatingRule(assignmentId, draft))
      setStoreOperatingRules((prev) => [saved, ...prev])
      setSelectedRuleId(saved.id)
      setRuleSaveState({ kind: 'success', message: '영업 규칙을 추가했습니다.' })
    } catch (error) {
      setStoreOperatingRules((prev) => [draft, ...prev])
      setSelectedRuleId(draft.id)
      setRuleSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveRule = async () => {
    if (!selectedRule) return
    const nextRule = {
      ...ruleDraft,
      openTime: nullIfBlank(ruleDraft.openTime),
      closeTime: nullIfBlank(ruleDraft.closeTime),
      textOverride: nullIfBlank(ruleDraft.textOverride),
    }
    setRuleSaveState({ kind: 'saving', message: '영업 규칙 저장 중...' })
    try {
      const saved = mergeApiEntity(nextRule, await adminStoresApi.patchStoreOperatingRule(nextRule.id, nextRule))
      setStoreOperatingRules((prev) => replaceById(prev, saved))
      setRuleSaveState({ kind: 'success', message: '영업 규칙을 저장했습니다.' })
    } catch (error) {
      setStoreOperatingRules((prev) => replaceById(prev, nextRule))
      setRuleSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const handleCreateNotice = async () => {
    const draft = {
      ...createEmptyNotice(),
      assignmentId: selectedAssignmentId,
      slotId: selectedAssignment?.slotId ?? null,
      tenantStoreId: selectedAssignment?.tenantStoreId ?? null,
    }
    setNoticeSaveState({ kind: 'saving', message: '공지 추가 중...' })
    try {
      const saved = mergeApiEntity(draft, await adminStoresApi.createStoreNotice(draft))
      setStoreNotices((prev) => [saved, ...prev])
      setSelectedNoticeId(saved.id)
      setNoticeSaveState({ kind: 'success', message: '공지를 추가했습니다.' })
    } catch (error) {
      setStoreNotices((prev) => [draft, ...prev])
      setSelectedNoticeId(draft.id)
      setNoticeSaveState({ kind: 'error', message: `API 추가 실패: ${getErrorMessage(error)}. 샘플 목록에만 반영했습니다.` })
    }
  }

  const handleSaveNotice = async () => {
    if (!selectedNotice) return
    const nextNotice = {
      ...noticeDraft,
      title: noticeDraft.title.trim(),
      body: noticeDraft.body.trim(),
      slotId: noticeDraft.slotId || null,
      tenantStoreId: noticeDraft.tenantStoreId || null,
      assignmentId: noticeDraft.assignmentId || null,
    }
    setNoticeSaveState({ kind: 'saving', message: '공지 저장 중...' })
    try {
      const saved = mergeApiEntity(nextNotice, await adminStoresApi.patchStoreNotice(nextNotice.id, nextNotice))
      setStoreNotices((prev) => replaceById(prev, saved))
      setNoticeSaveState({ kind: 'success', message: '공지를 저장했습니다.' })
    } catch (error) {
      setStoreNotices((prev) => replaceById(prev, nextNotice))
      setNoticeSaveState({ kind: 'error', message: `API 저장 실패: ${getErrorMessage(error)}. 현재 화면에는 반영했습니다.` })
    }
  }

  const topSummary = (
    <Section
      title="잠실 매장 관리자"
      description="현재 연결 상태와 데이터 품질을 확인합니다."
      action={
        <Button variant="secondary" size="md" onClick={() => void loadAdminData()}>
          <RefreshCw size={16} />
          {loadState === 'loading' ? '새로고침 중' : '새로고침'}
        </Button>
      }
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone={{ bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD' }}>
          {loadState === 'loading' ? '로딩 중' : `마지막 동기화 ${lastLoadedAt ?? '대기 중'}`}
        </Badge>
        <Badge tone={{ bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' }}>
          API {Object.values(sources).filter((value) => value === 'api').length}개
        </Badge>
        <Badge tone={{ bg: '#FFF7ED', color: '#B45309', border: '#F59E0B' }}>
          샘플 fallback {fallbackResources.length}개
        </Badge>
      </div>

      {fallbackResources.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            borderRadius: 12,
            border: '1.5px solid #F59E0B',
            background: '#FFF7ED',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#B45309" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#B45309' }}>
              일부 관리자 API가 비어 있거나 응답하지 않아 샘플 데이터를 사용 중입니다.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {fallbackResources.map((key) => (
              <Badge key={key} tone={{ bg: '#FFF', color: '#9A3412', border: '#FDBA74' }}>
                {REVIEW_RESOURCE_LABELS[key]} · {formatFallbackReason(errors[key])}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </Section>
  )

  const workbench = (
    <Section
      title="운영 워크벤치"
      description="매장 배정을 기준으로 메뉴, 용기 정책, 영업시간, 공지를 같이 확인합니다."
      action={
        <Badge tone={filteredAssignmentRows.length > 0 ? ISSUE_TONE : RESOLVED_TONE}>
          {filteredAssignmentRows.length}개 표시
        </Badge>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {[
          { label: '운영 중', value: workStats.active, filter: 'ACTIVE' as const },
          { label: '확인 필요', value: workStats.needsAttention, filter: 'NEEDS_ATTENTION' as const },
          { label: '메뉴 없음', value: workStats.missingMenu, filter: 'MISSING_MENU' as const },
          { label: '정책 미확인', value: workStats.missingPolicy, filter: 'MISSING_POLICY' as const },
        ].map((metric) => {
          const active = workStatusFilter === metric.filter
          return (
            <button
              key={metric.filter}
              type="button"
              onClick={() => setWorkStatusFilter(metric.filter)}
              style={{
                minHeight: 72,
                borderRadius: 14,
                border: active ? '2px solid #C85C77' : '1.5px solid #E5E7EB',
                background: active ? '#FFF0F3' : '#FFF',
                padding: '12px 10px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280' }}>{metric.label}</div>
              <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: '#111827' }}>{metric.value}</div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(120px, 0.7fr)', gap: 8 }}>
        <Field label="검색">
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              color="#9CA3AF"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              value={workQuery}
              onChange={(event) => setWorkQuery(event.target.value)}
              placeholder="가게, 메뉴, 슬롯, 게이트"
              style={inputStyle({ paddingLeft: 36 })}
            />
          </div>
        </Field>
        <Field label="층">
          <select value={workFloor} onChange={(event) => setWorkFloor(event.target.value)} style={inputStyle()}>
            {workFloors.map((floor) => (
              <option key={floor} value={floor}>
                {floor === 'ALL' ? '전체 층' : floor}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {WORK_STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`cb-chip${workStatusFilter === filter.id ? ' is-active' : ''}`}
            onClick={() => setWorkStatusFilter(filter.id)}
            style={{ flexShrink: 0 }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {selectedAssignmentRow ? (
        <div
          style={{
            borderRadius: 14,
            border: '1.5px solid #E5E7EB',
            background: '#FFF',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', overflowWrap: 'anywhere' }}>
                {selectedAssignmentRow.displayName}
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#6B7280', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                {selectedAssignmentRow.slotLabel} · {selectedAssignmentRow.gateLabel}
              </div>
            </div>
            <Badge tone={STATUS_TONES[selectedAssignmentRow.assignment.verificationStatus]}>
              {formatStatusLabel(selectedAssignmentRow.assignment.verificationStatus)}
            </Badge>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge tone={NEUTRAL_TONE}>판매 메뉴 {selectedAssignmentRow.offerings.length}</Badge>
            <Badge tone={NEUTRAL_TONE}>영업 규칙 {selectedAssignmentRow.rules.length}</Badge>
            <Badge tone={NEUTRAL_TONE}>공지 {selectedAssignmentRow.notices.length}</Badge>
            <Badge tone={selectedAssignmentRow.priceMissingCount > 0 ? ISSUE_TONE : NEUTRAL_TONE}>
              가격 누락 {selectedAssignmentRow.priceMissingCount}
            </Badge>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selectedAssignmentRow.issues.length === 0 ? (
              <Badge tone={RESOLVED_TONE}>현재 큐에서 해결됨</Badge>
            ) : (
              selectedAssignmentRow.issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => openWorkIssue(selectedAssignmentRow, issue)}
                  style={{
                    border: `1.5px solid ${ISSUE_TONE.border}`,
                    background: ISSUE_TONE.bg,
                    color: ISSUE_TONE.color,
                    borderRadius: 999,
                    padding: '5px 9px',
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {issue.label}
                </button>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="soft" size="md" onClick={() => focusAssignmentRow(selectedAssignmentRow, 'assignments')}>
              배정
            </Button>
            <Button variant="soft" size="md" onClick={() => focusAssignmentRow(selectedAssignmentRow, 'menu', 'offerings')}>
              판매 메뉴
            </Button>
            <Button variant="soft" size="md" onClick={() => focusAssignmentRow(selectedAssignmentRow, 'operations')}>
              영업
            </Button>
            <Button variant="soft" size="md" onClick={() => focusAssignmentRow(selectedAssignmentRow, 'notices')}>
              공지
            </Button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredAssignmentRows.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: '1.5px dashed #D1D5DB',
              background: '#FFF',
              color: '#6B7280',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            조건에 맞는 운영 단위가 없습니다.
          </div>
        ) : (
          filteredAssignmentRows.map((row) => (
            <ListButton
              key={row.assignment.id}
              active={row.assignment.id === selectedAssignmentId}
              title={`${row.displayName} · ${row.slotLabel}`}
              subtitle={`${row.assignment.status} · ${row.gateLabel} · 메뉴 ${row.offerings.length} · 영업 ${row.rules.length}`}
              meta={
                row.issues.length > 0 ? (
                  <Badge tone={ISSUE_TONE}>{row.issues.length}건</Badge>
                ) : (
                  <Badge tone={RESOLVED_TONE}>완료</Badge>
                )
              }
              onClick={() => focusAssignmentRow(row, 'assignments')}
            />
          ))
        )}
      </div>
    </Section>
  )

  const renderSlots = () => (
    <>
      <Section
        title="매장 슬롯"
        description={`현재 ${storeSlots.length}개 슬롯`}
        action={
          <Button variant="soft" size="md" onClick={() => void handleCreateSlot()}>
            <Plus size={16} />
            슬롯 추가
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {storeSlots.map((slot) => (
            <ListButton
              key={slot.id}
              active={slot.id === selectedSlotId}
              title={`${slot.slotCode}${slot.officialSlotNo ? ` · ${slot.officialSlotNo}` : ''}`}
              subtitle={`${slot.floor} · ${slot.category} · ${slot.sectionHint ?? '구역 미입력'}`}
              meta={<Badge tone={STATUS_TONES[slot.verificationStatus]}>{formatStatusLabel(slot.verificationStatus)}</Badge>}
              onClick={() => setSelectedSlotId(slot.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="슬롯 편집" description={`${formatSourceLabel(sources.storeSlots)} 데이터 기준 편집`}>
        <Field label="슬롯 코드">
          <input
            value={slotDraft.slotCode}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, slotCode: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="공식 번호">
          <input
            value={slotDraft.officialSlotNo ?? ''}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, officialSlotNo: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="층">
          <select
            value={slotDraft.floor}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, floor: event.target.value }))}
            style={inputStyle()}
          >
            {['1F', '2F', '2.5F', '3F', '4F'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="게이트">
          <input
            value={slotDraft.gate ?? ''}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, gate: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="카테고리">
          <input
            value={slotDraft.category}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, category: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="좌석 힌트">
          <input
            value={slotDraft.sectionHint ?? ''}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, sectionHint: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="지도 X 좌표">
          <input
            value={slotDraft.xPct ?? ''}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, xPct: parseOptionalNumber(event.target.value) }))}
            style={inputStyle()}
            inputMode="decimal"
          />
        </Field>
        <Field label="지도 Y 좌표">
          <input
            value={slotDraft.yPct ?? ''}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, yPct: parseOptionalNumber(event.target.value) }))}
            style={inputStyle()}
            inputMode="decimal"
          />
        </Field>
        <Field label="검수 상태">
          <select
            value={slotDraft.verificationStatus}
            onChange={(event) =>
              setSlotDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
            }
            style={inputStyle()}
          >
            {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="랜드마크 메모">
          <textarea
            value={slotDraft.landmarkNote ?? ''}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, landmarkNote: event.target.value }))}
            style={inputStyle({ minHeight: 92, resize: 'vertical' })}
          />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#374151' }}>
          <input
            type="checkbox"
            checked={slotDraft.isFoodMapVisible}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, isFoodMapVisible: event.target.checked }))}
          />
          식음료 지도 노출
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#374151' }}>
          <input
            type="checkbox"
            checked={slotDraft.isCodeProvisional}
            onChange={(event) => setSlotDraft((prev) => ({ ...prev, isCodeProvisional: event.target.checked }))}
          />
          임시 코드
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="md" onClick={() => void handleSaveSlot()}>
            <Save size={16} />
            저장
          </Button>
          <StatusNote state={slotSaveState} />
        </div>
      </Section>
    </>
  )

  const renderStores = () => (
    <>
      <Section
        title="입점가게"
        description={`현재 ${tenantStores.length}개 매장`}
        action={
          <Button variant="soft" size="md" onClick={() => void handleCreateStore()}>
            <Plus size={16} />
            가게 추가
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tenantStores.map((store) => (
            <ListButton
              key={store.id}
              active={store.id === selectedStoreId}
              title={store.name}
              subtitle={`${store.category} · ${formatPolicy(store.defaultReusableContainerPolicy)} / ${formatPolicy(store.defaultPersonalContainerPolicy)}`}
              meta={<Badge tone={STATUS_TONES[store.verificationStatus]}>{formatStatusLabel(store.verificationStatus)}</Badge>}
              onClick={() => setSelectedStoreId(store.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="입점가게 편집" description={`${formatSourceLabel(sources.tenantStores)} 데이터 기준 편집`}>
        <Field label="표시명">
          <input
            value={storeDraft.name}
            onChange={(event) => setStoreDraft((prev) => ({ ...prev, name: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="브랜드명">
          <input
            value={storeDraft.brandName}
            onChange={(event) => setStoreDraft((prev) => ({ ...prev, brandName: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="카테고리">
          <input
            value={storeDraft.category}
            onChange={(event) => setStoreDraft((prev) => ({ ...prev, category: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="기본 영업시간">
          <input
            value={storeDraft.defaultHoursText ?? ''}
            onChange={(event) => setStoreDraft((prev) => ({ ...prev, defaultHoursText: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="기본 다회용기 정책">
          <select
            value={storeDraft.defaultReusableContainerPolicy ?? ''}
            onChange={(event) =>
              setStoreDraft((prev) => ({
                ...prev,
                defaultReusableContainerPolicy: (event.target.value || null) as PolicyChoice,
              }))
            }
            style={inputStyle()}
          >
            <option value="">미확인</option>
            <option value="ALLOWED">가능</option>
            <option value="DISALLOWED">불가</option>
            <option value="CHECK_ON_SITE">현장 확인</option>
          </select>
        </Field>
        <Field label="기본 개인용기 정책">
          <select
            value={storeDraft.defaultPersonalContainerPolicy ?? ''}
            onChange={(event) =>
              setStoreDraft((prev) => ({
                ...prev,
                defaultPersonalContainerPolicy: (event.target.value || null) as PolicyChoice,
              }))
            }
            style={inputStyle()}
          >
            <option value="">미확인</option>
            <option value="ALLOWED">가능</option>
            <option value="DISALLOWED">불가</option>
            <option value="CHECK_ON_SITE">현장 확인</option>
          </select>
        </Field>
        <Field label="검수 상태">
          <select
            value={storeDraft.verificationStatus}
            onChange={(event) =>
              setStoreDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
            }
            style={inputStyle()}
          >
            {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="설명">
          <textarea
            value={storeDraft.description ?? ''}
            onChange={(event) => setStoreDraft((prev) => ({ ...prev, description: event.target.value }))}
            style={inputStyle({ minHeight: 92, resize: 'vertical' })}
          />
        </Field>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="md" onClick={() => void handleSaveStore()}>
            <Save size={16} />
            저장
          </Button>
          <StatusNote state={storeSaveState} />
        </div>
      </Section>
    </>
  )

  const renderAssignments = () => (
    <>
      <Section
        title="배정"
        description={`운영 워크벤치 조건 기준 ${filteredAssignmentRows.length}개 / 전체 ${storeAssignments.length}개`}
        action={
          <Button variant="soft" size="md" onClick={() => void handleCreateAssignment()} disabled={!storeSlots[0] || !tenantStores[0]}>
            <Plus size={16} />
            배정 추가
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredAssignmentRows.map((row) => (
            <ListButton
              key={row.assignment.id}
              active={row.assignment.id === selectedAssignmentId}
              title={formatAssignmentLabel(row.assignment.id)}
              subtitle={`${row.assignment.status} · ${row.assignment.hoursText ?? '운영시간 미입력'} · 메뉴 ${row.offerings.length}`}
              meta={
                row.issues.length > 0 ? (
                  <Badge tone={ISSUE_TONE}>{row.issues.length}건</Badge>
                ) : (
                  <Badge tone={STATUS_TONES[row.assignment.verificationStatus]}>
                    {formatStatusLabel(row.assignment.verificationStatus)}
                  </Badge>
                )
              }
              onClick={() => focusAssignmentRow(row)}
            />
          ))}
        </div>
      </Section>

      <Section title="배정 편집" description={`${formatSourceLabel(sources.storeAssignments)} 데이터 기준 편집`}>
        <Field label="슬롯">
          <select
            value={assignmentDraft.slotId}
            onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, slotId: event.target.value }))}
            style={inputStyle()}
          >
            {storeSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {formatSlotLabel(slot.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="입점가게">
          <select
            value={assignmentDraft.tenantStoreId}
            onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, tenantStoreId: event.target.value }))}
            style={inputStyle()}
          >
            {tenantStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="시즌">
          <input
            value={assignmentDraft.seasonYear}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (Number.isFinite(next)) setAssignmentDraft((prev) => ({ ...prev, seasonYear: next }))
            }}
            style={inputStyle()}
            inputMode="numeric"
          />
        </Field>
        <Field label="배정 상태">
          <select
            value={assignmentDraft.status}
            onChange={(event) =>
              setAssignmentDraft((prev) => ({
                ...prev,
                status: event.target.value as StoreAssignment['status'],
              }))
            }
            style={inputStyle()}
          >
            {['ACTIVE', 'PLANNED', 'TEMP_CLOSED', 'ENDED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="영업시간 텍스트">
          <input
            value={assignmentDraft.hoursText ?? ''}
            onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, hoursText: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="표시명 오버라이드">
          <input
            value={assignmentDraft.displayNameOverride ?? ''}
            onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, displayNameOverride: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="공개 메모">
          <textarea
            value={assignmentDraft.publicNote ?? ''}
            onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, publicNote: event.target.value }))}
            style={inputStyle({ minHeight: 92, resize: 'vertical' })}
          />
        </Field>
        <Field label="검수 상태">
          <select
            value={assignmentDraft.verificationStatus}
            onChange={(event) =>
              setAssignmentDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
            }
            style={inputStyle()}
          >
            {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="md" onClick={() => void handleSaveAssignment()}>
            <Save size={16} />
            저장
          </Button>
          <StatusNote state={assignmentSaveState} />
        </div>
      </Section>
    </>
  )

  const renderMenu = () => (
    <>
      <Section title="메뉴 편집" description="기본 메뉴와 실제 판매 메뉴를 같은 화면에서 전환합니다.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'items' as const, label: '기본 메뉴' },
            { id: 'offerings' as const, label: '판매 메뉴' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cb-chip${menuView === item.id ? ' is-active' : ''}`}
              onClick={() => setMenuView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Section>

      {menuView === 'items' ? (
        <>
          <Section
            title="기본 메뉴 목록"
            description={`${selectedStore ? `${selectedStore.name} 기준 ` : ''}${visibleMenuItems.length}개 / 전체 ${tenantMenuItems.length}개`}
            action={
              <Button variant="soft" size="md" onClick={() => void handleCreateMenuItem()} disabled={!tenantStores[0]}>
                <Plus size={16} />
                메뉴 추가
              </Button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleMenuItems.map((item) => (
                <ListButton
                  key={item.id}
                  active={item.id === selectedMenuItemId}
                  title={item.name}
                  subtitle={`${formatStoreLabel(item.tenantStoreId)} · ${formatPrice(item.basePriceKrw, item.basePriceText)}`}
                  meta={<Badge tone={STATUS_TONES[item.verificationStatus]}>{formatStatusLabel(item.verificationStatus)}</Badge>}
                  onClick={() => setSelectedMenuItemId(item.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="기본 메뉴 편집" description={`${formatSourceLabel(sources.tenantMenuItems)} 데이터 기준 편집`}>
            <Field label="입점가게">
              <select
                value={menuItemDraft.tenantStoreId}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, tenantStoreId: event.target.value }))}
                style={inputStyle()}
              >
                {tenantStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="메뉴명">
              <input
                value={menuItemDraft.name}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, name: event.target.value }))}
                style={inputStyle()}
              />
            </Field>
            <Field label="카테고리">
              <input
                value={menuItemDraft.category}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, category: event.target.value }))}
                style={inputStyle()}
              />
            </Field>
            <Field label="가격 숫자">
              <input
                value={menuItemDraft.basePriceKrw ?? ''}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, basePriceKrw: parseOptionalNumber(event.target.value) }))}
                style={inputStyle()}
                inputMode="numeric"
              />
            </Field>
            <Field label="가격 텍스트" hint="모를 때는 비워 두거나 현장 확인으로 입력">
              <input
                value={menuItemDraft.basePriceText ?? ''}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, basePriceText: event.target.value }))}
                style={inputStyle()}
              />
            </Field>
            <Field label="검수 상태">
              <select
                value={menuItemDraft.verificationStatus}
                onChange={(event) =>
                  setMenuItemDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
                }
                style={inputStyle()}
              >
                {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="설명">
              <textarea
                value={menuItemDraft.description ?? ''}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, description: event.target.value }))}
                style={inputStyle({ minHeight: 92, resize: 'vertical' })}
              />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#374151' }}>
              <input
                type="checkbox"
                checked={menuItemDraft.isActive}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              판매 중
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#374151' }}>
              <input
                type="checkbox"
                checked={menuItemDraft.isSignature}
                onChange={(event) => setMenuItemDraft((prev) => ({ ...prev, isSignature: event.target.checked }))}
              />
              대표 메뉴
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" size="md" onClick={() => void handleSaveMenuItem()}>
                <Save size={16} />
                저장
              </Button>
              <StatusNote state={menuItemSaveState} />
            </div>
          </Section>
        </>
      ) : (
        <>
          <Section
            title="판매 메뉴 목록"
            description={`${selectedAssignment ? `${formatAssignmentLabel(selectedAssignment.id)} 기준 ` : ''}${visibleOfferings.length}개 / 전체 ${storeMenuOfferings.length}개`}
            action={
              <Button
                variant="soft"
                size="md"
                onClick={() => void handleCreateOffering()}
                disabled={!storeAssignments[0] || !tenantMenuItems[0]}
              >
                <Plus size={16} />
                판매 메뉴 추가
              </Button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleOfferings.map((offering) => (
                <ListButton
                  key={offering.id}
                  active={offering.id === selectedOfferingId}
                  title={menuItemById.get(offering.menuItemId)?.name ?? '미지정 메뉴'}
                  subtitle={`${formatAssignmentLabel(offering.assignmentId)} · ${formatPrice(offering.priceKrw, offering.priceText)}`}
                  meta={<Badge tone={STATUS_TONES[offering.verificationStatus]}>{formatStatusLabel(offering.verificationStatus)}</Badge>}
                  onClick={() => setSelectedOfferingId(offering.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="판매 메뉴 편집" description={`${formatSourceLabel(sources.storeMenuOfferings)} 데이터 기준 편집`}>
            <Field label="배정">
              <select
                value={offeringDraft.assignmentId}
                onChange={(event) => setOfferingDraft((prev) => ({ ...prev, assignmentId: event.target.value }))}
                style={inputStyle()}
              >
                {storeAssignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {formatAssignmentLabel(assignment.id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="메뉴">
              <select
                value={offeringDraft.menuItemId}
                onChange={(event) => setOfferingDraft((prev) => ({ ...prev, menuItemId: event.target.value }))}
                style={inputStyle()}
              >
                {tenantMenuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="가격 숫자">
              <input
                value={offeringDraft.priceKrw ?? ''}
                onChange={(event) => setOfferingDraft((prev) => ({ ...prev, priceKrw: parseOptionalNumber(event.target.value) }))}
                style={inputStyle()}
                inputMode="numeric"
              />
            </Field>
            <Field label="가격 텍스트">
              <input
                value={offeringDraft.priceText ?? ''}
                onChange={(event) => setOfferingDraft((prev) => ({ ...prev, priceText: event.target.value }))}
                style={inputStyle()}
              />
            </Field>
            <Field label="판매 상태">
              <select
                value={offeringDraft.saleStatus}
                onChange={(event) =>
                  setOfferingDraft((prev) => ({
                    ...prev,
                    saleStatus: event.target.value as StoreMenuOffering['saleStatus'],
                  }))
                }
                style={inputStyle()}
              >
                {['ON_SALE', 'SOLD_OUT', 'HIDDEN'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="다회용기 정책">
              <select
                value={offeringDraft.usesReusableContainer ?? ''}
                onChange={(event) =>
                  setOfferingDraft((prev) => ({
                    ...prev,
                    usesReusableContainer: (event.target.value || null) as PolicyChoice,
                  }))
                }
                style={inputStyle()}
              >
                <option value="">미확인</option>
                <option value="USE_DEFAULT">기본값 사용</option>
                <option value="ALLOWED">가능</option>
                <option value="DISALLOWED">불가</option>
                <option value="CHECK_ON_SITE">현장 확인</option>
              </select>
            </Field>
            <Field label="개인용기 정책">
              <select
                value={offeringDraft.personalContainerAllowed ?? ''}
                onChange={(event) =>
                  setOfferingDraft((prev) => ({
                    ...prev,
                    personalContainerAllowed: (event.target.value || null) as PolicyChoice,
                  }))
                }
                style={inputStyle()}
              >
                <option value="">미확인</option>
                <option value="USE_DEFAULT">기본값 사용</option>
                <option value="ALLOWED">가능</option>
                <option value="DISALLOWED">불가</option>
                <option value="CHECK_ON_SITE">현장 확인</option>
              </select>
            </Field>
            <Field label="검수 상태">
              <select
                value={offeringDraft.verificationStatus}
                onChange={(event) =>
                  setOfferingDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
                }
                style={inputStyle()}
              >
                {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="메모">
              <textarea
                value={offeringDraft.note ?? ''}
                onChange={(event) => setOfferingDraft((prev) => ({ ...prev, note: event.target.value }))}
                style={inputStyle({ minHeight: 92, resize: 'vertical' })}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" size="md" onClick={() => void handleSaveOffering()}>
                <Save size={16} />
                저장
              </Button>
              <StatusNote state={offeringSaveState} />
            </div>
          </Section>
        </>
      )}
    </>
  )

  const renderOperations = () => (
    <>
      <Section
        title="영업 규칙"
        description={`${selectedAssignment ? `${formatAssignmentLabel(selectedAssignment.id)} 기준 ` : ''}${visibleOperatingRules.length}개 / 전체 ${storeOperatingRules.length}개`}
        action={
          <Button variant="soft" size="md" onClick={() => void handleCreateRule()} disabled={!storeAssignments[0]}>
            <Plus size={16} />
            규칙 추가
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleOperatingRules.map((rule) => (
            <ListButton
              key={rule.id}
              active={rule.id === selectedRuleId}
              title={formatAssignmentLabel(rule.assignmentId)}
              subtitle={formatRuleLabel(rule)}
              meta={<Badge tone={STATUS_TONES[rule.verificationStatus]}>{formatStatusLabel(rule.verificationStatus)}</Badge>}
              onClick={() => setSelectedRuleId(rule.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="영업 규칙 편집" description={`${formatSourceLabel(sources.storeOperatingRules)} 데이터 기준 편집`}>
        <Field label="배정">
          <select
            value={ruleDraft.assignmentId}
            onChange={(event) => setRuleDraft((prev) => ({ ...prev, assignmentId: event.target.value }))}
            style={inputStyle()}
          >
            {storeAssignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {formatAssignmentLabel(assignment.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="규칙 타입">
          <select
            value={ruleDraft.ruleType}
            onChange={(event) =>
              setRuleDraft((prev) => ({
                ...prev,
                ruleType: event.target.value as StoreOperatingRule['ruleType'],
              }))
            }
            style={inputStyle()}
          >
            {['ALL_DAYS', 'GAME_DAY', 'NON_GAME_DAY', 'WEEKDAY', 'WEEKEND', 'SPECIAL_DATE', 'TEXT_ONLY'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="오픈 시간">
          <input
            value={ruleDraft.openTime ?? ''}
            onChange={(event) => setRuleDraft((prev) => ({ ...prev, openTime: event.target.value }))}
            style={inputStyle()}
            placeholder="16:30"
          />
        </Field>
        <Field label="마감 시간">
          <input
            value={ruleDraft.closeTime ?? ''}
            onChange={(event) => setRuleDraft((prev) => ({ ...prev, closeTime: event.target.value }))}
            style={inputStyle()}
            placeholder="21:30"
          />
        </Field>
        <Field label="텍스트 운영 문구">
          <textarea
            value={ruleDraft.textOverride ?? ''}
            onChange={(event) => setRuleDraft((prev) => ({ ...prev, textOverride: event.target.value }))}
            style={inputStyle({ minHeight: 92, resize: 'vertical' })}
          />
        </Field>
        <Field label="검수 상태">
          <select
            value={ruleDraft.verificationStatus}
            onChange={(event) =>
              setRuleDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
            }
            style={inputStyle()}
          >
            {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#374151' }}>
          <input
            type="checkbox"
            checked={ruleDraft.isActive}
            onChange={(event) => setRuleDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          현재 활성 규칙
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="md" onClick={() => void handleSaveRule()}>
            <Save size={16} />
            저장
          </Button>
          <StatusNote state={ruleSaveState} />
        </div>
      </Section>
    </>
  )

  const renderNotices = () => (
    <>
      <Section
        title="공지"
        description={`${selectedAssignment ? `${formatAssignmentLabel(selectedAssignment.id)} 기준 ` : ''}${visibleNotices.length}개 / 전체 ${storeNotices.length}개`}
        action={
          <Button variant="soft" size="md" onClick={() => void handleCreateNotice()}>
            <Plus size={16} />
            공지 추가
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleNotices.map((notice) => (
            <ListButton
              key={notice.id}
              active={notice.id === selectedNoticeId}
              title={notice.title}
              subtitle={`${notice.noticeType} · ${notice.isPublic ? '공개' : '내부'} 공지`}
              meta={<Badge tone={STATUS_TONES[notice.verificationStatus]}>{formatStatusLabel(notice.verificationStatus)}</Badge>}
              onClick={() => setSelectedNoticeId(notice.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="공지 편집" description={`${formatSourceLabel(sources.storeNotices)} 데이터 기준 편집`}>
        <Field label="제목">
          <input
            value={noticeDraft.title}
            onChange={(event) => setNoticeDraft((prev) => ({ ...prev, title: event.target.value }))}
            style={inputStyle()}
          />
        </Field>
        <Field label="공지 타입">
          <select
            value={noticeDraft.noticeType}
            onChange={(event) =>
              setNoticeDraft((prev) => ({
                ...prev,
                noticeType: event.target.value as StoreNotice['noticeType'],
              }))
            }
            style={inputStyle()}
          >
            {['GENERAL', 'TEMP_CLOSED', 'SOLD_OUT', 'EVENT', 'DELAY', 'MENU_CHANGED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="연결 슬롯">
          <select
            value={noticeDraft.slotId ?? ''}
            onChange={(event) => setNoticeDraft((prev) => ({ ...prev, slotId: event.target.value || null }))}
            style={inputStyle()}
          >
            <option value="">미연결</option>
            {storeSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {formatSlotLabel(slot.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="연결 가게">
          <select
            value={noticeDraft.tenantStoreId ?? ''}
            onChange={(event) => setNoticeDraft((prev) => ({ ...prev, tenantStoreId: event.target.value || null }))}
            style={inputStyle()}
          >
            <option value="">미연결</option>
            {tenantStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="연결 배정">
          <select
            value={noticeDraft.assignmentId ?? ''}
            onChange={(event) => setNoticeDraft((prev) => ({ ...prev, assignmentId: event.target.value || null }))}
            style={inputStyle()}
          >
            <option value="">미연결</option>
            {storeAssignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {formatAssignmentLabel(assignment.id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="검수 상태">
          <select
            value={noticeDraft.verificationStatus}
            onChange={(event) =>
              setNoticeDraft((prev) => ({ ...prev, verificationStatus: event.target.value as VerificationStatus }))
            }
            style={inputStyle()}
          >
            {['DRAFT', 'NEEDS_REVIEW', 'VERIFIED'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="본문">
          <textarea
            value={noticeDraft.body}
            onChange={(event) => setNoticeDraft((prev) => ({ ...prev, body: event.target.value }))}
            style={inputStyle({ minHeight: 110, resize: 'vertical' })}
          />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#374151' }}>
          <input
            type="checkbox"
            checked={noticeDraft.isPublic}
            onChange={(event) => setNoticeDraft((prev) => ({ ...prev, isPublic: event.target.checked }))}
          />
          사용자 공개 공지
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="md" onClick={() => void handleSaveNotice()}>
            <Save size={16} />
            저장
          </Button>
          <StatusNote state={noticeSaveState} />
        </div>
      </Section>
    </>
  )

  const renderReview = () => (
    <>
      <Section title="검수 대시보드" description="상태값과 누락값을 한 번에 모아 봅니다.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {REVIEW_FILTERS.map((filter) => {
            const active = reviewFilter === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setReviewFilter(filter.id)}
                style={{
                  borderRadius: 14,
                  border: active ? '2px solid #C85C77' : '1.5px solid #E5E7EB',
                  background: active ? '#FFF0F3' : '#FFF',
                  padding: '12px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280' }}>{filter.label}</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: '#111827' }}>{filterCounts[filter.id]}</div>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={{ bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' }}>슬롯 {storeSlots.length}</Badge>
          <Badge tone={{ bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' }}>매장 {tenantStores.length}</Badge>
          <Badge tone={{ bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' }}>메뉴 {tenantMenuItems.length + storeMenuOfferings.length}</Badge>
        </div>
      </Section>

      <Section title="검수 대상 목록" description={`${REVIEW_FILTERS.find((item) => item.id === reviewFilter)?.label ?? ''} 필터`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredReviewItems.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                border: '1.5px dashed #D1D5DB',
                background: '#FFF',
                color: '#6B7280',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              현재 필터에 해당하는 항목이 없습니다.
            </div>
          ) : (
            filteredReviewItems.map((issue) => (
              <ListButton
                key={issue.id}
                active={false}
                title={issue.title}
                subtitle={issue.subtitle}
                meta={<Badge tone={STATUS_TONES[issue.status]}>{formatStatusLabel(issue.status)}</Badge>}
                onClick={() => jumpToIssue(issue)}
              />
            ))
          )}
        </div>
      </Section>
    </>
  )

  const content =
    activeTab === 'slots'
      ? renderSlots()
      : activeTab === 'stores'
        ? renderStores()
        : activeTab === 'assignments'
          ? renderAssignments()
          : activeTab === 'menu'
            ? renderMenu()
            : activeTab === 'operations'
              ? renderOperations()
              : activeTab === 'notices'
                ? renderNotices()
                : renderReview()

  return (
    <Screen>
      <ScreenHeader
        eyebrow="관리자"
        title="매장 운영 관리"
        description="잠실야구장 내부 식음료 매장의 위치, 입점, 메뉴, 운영 정보를 관리합니다."
      />

      <ScrollArea stack>
        {topSummary}
        {workbench}

        <Section title="원장 편집" description="운영 단위에서 고른 항목을 세부 데이터별로 수정합니다.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="tablist" aria-label="관리자 탭">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`cb-chip${activeTab === tab.id ? ' is-active' : ''}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </Section>

        {content}
      </ScrollArea>

      <BottomNav />
    </Screen>
  )
}
