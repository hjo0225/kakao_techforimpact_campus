import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseBigIntId } from '../stores/stores.utils';

type AdminBody = Record<string, unknown>;

const ContainerPolicy = {
  UNKNOWN: 'UNKNOWN',
  SUPPORTED: 'SUPPORTED',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  MENU_DEPENDENT: 'MENU_DEPENDENT',
} as const;
type ContainerPolicy = (typeof ContainerPolicy)[keyof typeof ContainerPolicy];

const MenuSaleStatus = {
  ON_SALE: 'ON_SALE',
  SOLD_OUT: 'SOLD_OUT',
  HIDDEN: 'HIDDEN',
} as const;
type MenuSaleStatus = (typeof MenuSaleStatus)[keyof typeof MenuSaleStatus];

const StoreAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  PLANNED: 'PLANNED',
  TEMP_CLOSED: 'TEMP_CLOSED',
  ENDED: 'ENDED',
} as const;
type StoreAssignmentStatus =
  (typeof StoreAssignmentStatus)[keyof typeof StoreAssignmentStatus];

const StoreSide = {
  FIRST_BASE: 'FIRST_BASE',
  THIRD_BASE: 'THIRD_BASE',
  CENTER: 'CENTER',
  OUTFIELD: 'OUTFIELD',
  INFIELD: 'INFIELD',
  UNKNOWN: 'UNKNOWN',
} as const;
type StoreSide = (typeof StoreSide)[keyof typeof StoreSide];

const StoreSlotKind = {
  FOOD: 'FOOD',
  CAFE: 'CAFE',
  CONVENIENCE: 'CONVENIENCE',
  GOODS: 'GOODS',
  TICKET: 'TICKET',
  INFO: 'INFO',
  FAMILY: 'FAMILY',
  OTHER: 'OTHER',
} as const;
type StoreSlotKind = (typeof StoreSlotKind)[keyof typeof StoreSlotKind];

function readString(body: AdminBody, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNullableString(
  body: AdminBody,
  key: string,
): string | null | undefined {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (value === null || value === '') return null;
  return typeof value === 'string' ? value.trim() : undefined;
}

function readNumber(body: AdminBody, key: string): number | null | undefined {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readBoolean(body: AdminBody, key: string): boolean | undefined {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

function keepDefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listStoreSlots(query: AdminBody) {
    const stadiumCode = readString(query, 'stadiumCode') ?? 'JAMSIL';
    const floor = readString(query, 'floor');
    const slots = await this.prisma.storeSlot.findMany({
      where: {
        stadiumCode,
        ...(floor ? { floor: { code: floor } } : {}),
      },
      include: {
        floor: true,
        nearestGate: true,
      },
      orderBy: [{ floor: { sortOrder: 'asc' } }, { slotNo: 'asc' }],
    });

    return { items: slots.map((slot) => this.serializeSlot(slot)) };
  }

  async createStoreSlot(body: AdminBody) {
    const stadiumCode = readString(body, 'stadiumCode') ?? 'JAMSIL';
    const floorCode =
      readString(body, 'floor') ?? readString(body, 'floorCode') ?? '1F';
    const floor = await this.findFloor(stadiumCode, floorCode);
    const slotNo = readString(body, 'slotNo') ?? readString(body, 'slotCode');
    if (!slotNo) throw new BadRequestException('slotNo is required');

    const gate = await this.findGate(
      stadiumCode,
      readNullableString(body, 'gate'),
    );
    const slot = await this.prisma.storeSlot.create({
      data: {
        id: readString(body, 'id') ?? `${stadiumCode}-${slotNo}`,
        stadiumCode,
        floorId: floor.id,
        nearestGateId: gate?.id,
        slotNo,
        officialSlotNo: readNullableString(body, 'officialSlotNo') ?? slotNo,
        isCodeProvisional: readBoolean(body, 'isCodeProvisional') ?? false,
        slotKind: this.toStoreSlotKind(readString(body, 'category')),
        side: this.toStoreSide(readString(body, 'side')),
        areaLabel:
          readString(body, 'areaLabel') ??
          readString(body, 'sectionHint') ??
          floor.name,
        seatSectionHints: this.toSeatHints(
          readNullableString(body, 'sectionHint'),
        ),
        xPct: readNumber(body, 'xPct'),
        yPct: readNumber(body, 'yPct'),
        landmarkNote: readNullableString(body, 'landmarkNote'),
        sourceConfidence: readString(body, 'sourceConfidence') ?? 'LOW',
        verificationStatus: readString(body, 'verificationStatus') ?? 'DRAFT',
        isFoodMapVisible: readBoolean(body, 'isFoodMapVisible') ?? true,
        isTenantable: readBoolean(body, 'isTenantable') ?? true,
      } as any,
      include: { floor: true, nearestGate: true },
    });

    return this.serializeSlot(slot);
  }

  async patchStoreSlot(id: string, body: AdminBody) {
    const existing = await this.prisma.storeSlot.findUnique({
      where: { id },
      include: { floor: true },
    });
    if (!existing) throw new NotFoundException('slot not found');

    const floorCode =
      readString(body, 'floor') ?? readString(body, 'floorCode');
    const floor = floorCode
      ? await this.findFloor(existing.stadiumCode, floorCode)
      : undefined;
    const gate = await this.findGate(
      existing.stadiumCode,
      readNullableString(body, 'gate'),
    );

    const slot = await this.prisma.storeSlot.update({
      where: { id },
      data: keepDefined({
        floorId: floor?.id,
        nearestGateId: gate === undefined ? undefined : (gate?.id ?? null),
        slotNo: readString(body, 'slotNo') ?? readString(body, 'slotCode'),
        officialSlotNo: readNullableString(body, 'officialSlotNo'),
        isCodeProvisional: readBoolean(body, 'isCodeProvisional'),
        slotKind: readString(body, 'category')
          ? this.toStoreSlotKind(readString(body, 'category'))
          : undefined,
        side: readString(body, 'side')
          ? this.toStoreSide(readString(body, 'side'))
          : undefined,
        areaLabel:
          readString(body, 'areaLabel') ?? readString(body, 'sectionHint'),
        seatSectionHints: this.toSeatHints(
          readNullableString(body, 'sectionHint'),
        ),
        xPct: readNumber(body, 'xPct'),
        yPct: readNumber(body, 'yPct'),
        landmarkNote: readNullableString(body, 'landmarkNote'),
        sourceConfidence: readString(body, 'sourceConfidence'),
        verificationStatus: readString(body, 'verificationStatus'),
        isFoodMapVisible: readBoolean(body, 'isFoodMapVisible'),
        isTenantable: readBoolean(body, 'isTenantable'),
        isActive: readBoolean(body, 'isActive'),
      }) as any,
      include: { floor: true, nearestGate: true },
    });

    return this.serializeSlot(slot);
  }

  async deleteStoreSlot(id: string) {
    await this.prisma.storeSlot.update({
      where: { id },
      data: { isActive: false, isFoodMapVisible: false },
    });
    return { ok: true };
  }

  async listTenantStores() {
    const stores = await this.prisma.tenantStore.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return { items: stores.map((store) => this.serializeTenantStore(store)) };
  }

  async createTenantStore(body: AdminBody) {
    const name = readString(body, 'name');
    if (!name) throw new BadRequestException('name is required');

    const store = await this.prisma.tenantStore.create({
      data: this.tenantStoreData(body, name) as any,
    });
    return this.serializeTenantStore(store);
  }

  async patchTenantStore(id: string, body: AdminBody) {
    const store = await this.prisma.tenantStore.update({
      where: { id: parseBigIntId(id) },
      data: this.tenantStoreData(body) as any,
    });
    return this.serializeTenantStore(store);
  }

  async deleteTenantStore(id: string) {
    await this.prisma.tenantStore.delete({ where: { id: parseBigIntId(id) } });
    return { ok: true };
  }

  async listStoreAssignments() {
    const assignments = await this.prisma.storeAssignment.findMany({
      include: {
        operatingRules: { orderBy: [{ id: 'asc' }] },
      },
      orderBy: [{ seasonYear: 'desc' }, { id: 'desc' }],
    });
    return {
      items: assignments.map((assignment) =>
        this.serializeAssignment(assignment),
      ),
    };
  }

  async createStoreAssignment(body: AdminBody) {
    const slotId = readString(body, 'slotId');
    const tenantStoreId = readString(body, 'tenantStoreId');
    if (!slotId || !tenantStoreId) {
      throw new BadRequestException('slotId and tenantStoreId are required');
    }

    const assignment = await this.prisma.storeAssignment.create({
      data: this.assignmentData(body, slotId, tenantStoreId) as any,
      include: { operatingRules: true },
    });
    return this.serializeAssignment(assignment);
  }

  async patchStoreAssignment(id: string, body: AdminBody) {
    const assignment = await this.prisma.storeAssignment.update({
      where: { id: parseBigIntId(id) },
      data: this.assignmentData(body) as any,
      include: { operatingRules: true },
    });
    return this.serializeAssignment(assignment);
  }

  async deleteStoreAssignment(id: string) {
    await this.prisma.storeAssignment.update({
      where: { id: parseBigIntId(id) },
      data: { status: StoreAssignmentStatus.ENDED },
    });
    return { ok: true };
  }

  async listTenantMenuItems() {
    const items = await this.prisma.tenantMenuItem.findMany({
      orderBy: [{ tenantStoreId: 'asc' }, { name: 'asc' }],
    });
    return { items: items.map((item) => this.serializeMenuItem(item)) };
  }

  async createTenantMenuItem(tenantStoreId: string, body: AdminBody) {
    const name = readString(body, 'name');
    if (!name) throw new BadRequestException('name is required');

    const item = await this.prisma.tenantMenuItem.create({
      data: this.menuItemData(body, tenantStoreId, name) as any,
    });
    return this.serializeMenuItem(item);
  }

  async patchTenantMenuItem(id: string, body: AdminBody) {
    const item = await this.prisma.tenantMenuItem.update({
      where: { id: parseBigIntId(id) },
      data: this.menuItemData(body) as any,
    });
    return this.serializeMenuItem(item);
  }

  async deleteTenantMenuItem(id: string) {
    await this.prisma.tenantMenuItem.update({
      where: { id: parseBigIntId(id) },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async listStoreMenuOfferings() {
    const offerings = await this.prisma.storeMenuOffering.findMany({
      orderBy: [{ assignmentId: 'asc' }, { sortOrder: 'asc' }],
    });
    return {
      items: offerings.map((offering) => this.serializeOffering(offering)),
    };
  }

  async createStoreMenuOffering(assignmentId: string, body: AdminBody) {
    const menuItemId = readString(body, 'menuItemId');
    if (!menuItemId) throw new BadRequestException('menuItemId is required');

    const offering = await this.prisma.storeMenuOffering.create({
      data: this.offeringData(body, assignmentId, menuItemId) as any,
    });
    return this.serializeOffering(offering);
  }

  async patchStoreMenuOffering(id: string, body: AdminBody) {
    const offering = await this.prisma.storeMenuOffering.update({
      where: { id: parseBigIntId(id) },
      data: this.offeringData(body) as any,
    });
    return this.serializeOffering(offering);
  }

  async deleteStoreMenuOffering(id: string) {
    await this.prisma.storeMenuOffering.delete({
      where: { id: parseBigIntId(id) },
    });
    return { ok: true };
  }

  async listStoreOperatingRules() {
    const rules = await this.prisma.storeOperatingRule.findMany({
      orderBy: [{ assignmentId: 'asc' }, { id: 'asc' }],
    });
    return { items: rules.map((rule) => this.serializeOperatingRule(rule)) };
  }

  async createStoreOperatingRule(assignmentId: string, body: AdminBody) {
    const rule = await this.prisma.storeOperatingRule.create({
      data: this.operatingRuleData(body, assignmentId) as any,
    });
    return this.serializeOperatingRule(rule);
  }

  async patchStoreOperatingRule(id: string, body: AdminBody) {
    const rule = await this.prisma.storeOperatingRule.update({
      where: { id: parseBigIntId(id) },
      data: this.operatingRuleData(body) as any,
    });
    return this.serializeOperatingRule(rule);
  }

  async deleteStoreOperatingRule(id: string) {
    await this.prisma.storeOperatingRule.delete({
      where: { id: parseBigIntId(id) },
    });
    return { ok: true };
  }

  async listStoreNotices() {
    const notices = await this.prisma.storeNotice.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: notices.map((notice) => this.serializeNotice(notice)) };
  }

  async createStoreNotice(body: AdminBody) {
    const title = readString(body, 'title');
    const bodyText = readString(body, 'body');
    if (!title || !bodyText) {
      throw new BadRequestException('title and body are required');
    }

    const notice = await this.prisma.storeNotice.create({
      data: this.noticeData(body, title, bodyText) as any,
    });
    return this.serializeNotice(notice);
  }

  async patchStoreNotice(id: string, body: AdminBody) {
    const notice = await this.prisma.storeNotice.update({
      where: { id: parseBigIntId(id) },
      data: this.noticeData(body) as any,
    });
    return this.serializeNotice(notice);
  }

  async deleteStoreNotice(id: string) {
    await this.prisma.storeNotice.delete({ where: { id: parseBigIntId(id) } });
    return { ok: true };
  }

  private async findFloor(stadiumCode: string, code: string) {
    const floor = await this.prisma.stadiumFloor.findUnique({
      where: {
        stadiumCode_code: { stadiumCode, code },
      },
    });
    if (!floor) throw new NotFoundException('floor not found');
    return floor;
  }

  private async findGate(stadiumCode: string, code?: string | null) {
    if (code === undefined) return undefined;
    if (code === null) return null;
    return this.prisma.stadiumGate.findUnique({
      where: {
        stadiumCode_code: { stadiumCode, code },
      },
    });
  }

  private toStoreSlotKind(value?: string): StoreSlotKind {
    const normalized = value?.toUpperCase();
    if (normalized && normalized in StoreSlotKind) {
      return StoreSlotKind[normalized as keyof typeof StoreSlotKind];
    }
    if (normalized === 'MERCHANDISE') return StoreSlotKind.GOODS;
    if (normalized === 'TICKET_OFFICE') return StoreSlotKind.TICKET;
    if (normalized === 'FACILITY') return StoreSlotKind.FAMILY;
    return StoreSlotKind.FOOD;
  }

  private toStoreSide(value?: string): StoreSide {
    const normalized = value?.toUpperCase();
    if (normalized && normalized in StoreSide) {
      return StoreSide[normalized as keyof typeof StoreSide];
    }
    return StoreSide.UNKNOWN;
  }

  private toSeatHints(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toContainerPolicy(value: unknown): ContainerPolicy | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === 'USE_DEFAULT')
      return ContainerPolicy.UNKNOWN;
    if (value === 'ALLOWED' || value === 'SUPPORTED')
      return ContainerPolicy.SUPPORTED;
    if (value === 'DISALLOWED' || value === 'NOT_SUPPORTED')
      return ContainerPolicy.NOT_SUPPORTED;
    if (value === 'CHECK_ON_SITE' || value === 'MENU_DEPENDENT') {
      return ContainerPolicy.MENU_DEPENDENT;
    }
    return undefined;
  }

  private toPolicyChoice(value: ContainerPolicy | null | undefined) {
    switch (value) {
      case ContainerPolicy.SUPPORTED:
        return 'ALLOWED';
      case ContainerPolicy.NOT_SUPPORTED:
        return 'DISALLOWED';
      case ContainerPolicy.MENU_DEPENDENT:
        return 'CHECK_ON_SITE';
      case ContainerPolicy.UNKNOWN:
      default:
        return null;
    }
  }

  private toBooleanPolicy(value: unknown): boolean | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === 'USE_DEFAULT' || value === 'CHECK_ON_SITE')
      return null;
    if (value === 'ALLOWED' || value === true) return true;
    if (value === 'DISALLOWED' || value === false) return false;
    return undefined;
  }

  private fromBooleanPolicy(value: boolean | null | undefined) {
    if (value === true) return 'ALLOWED';
    if (value === false) return 'DISALLOWED';
    return null;
  }

  private toAssignmentStatus(
    value: unknown,
  ): StoreAssignmentStatus | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.toUpperCase();
    return normalized in StoreAssignmentStatus
      ? StoreAssignmentStatus[normalized as keyof typeof StoreAssignmentStatus]
      : undefined;
  }

  private toMenuSaleStatus(value: unknown): MenuSaleStatus | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.toUpperCase();
    return normalized in MenuSaleStatus
      ? MenuSaleStatus[normalized as keyof typeof MenuSaleStatus]
      : undefined;
  }

  private tenantStoreData(body: AdminBody, fallbackName?: string) {
    return keepDefined({
      name: readString(body, 'name') ?? fallbackName,
      brandName: readNullableString(body, 'brandName'),
      normalizedName:
        readString(body, 'normalizedName') ??
        (readString(body, 'name') ?? fallbackName)?.toLowerCase(),
      category: readString(body, 'category'),
      description: readNullableString(body, 'description'),
      defaultHoursText: readNullableString(body, 'defaultHoursText'),
      defaultReusableContainerPolicy: this.toContainerPolicy(
        body.defaultReusableContainerPolicy,
      ),
      defaultPersonalContainerPolicy: this.toContainerPolicy(
        body.defaultPersonalContainerPolicy,
      ),
      publicNote: readNullableString(body, 'publicNote'),
      adminNote: readNullableString(body, 'adminNote'),
    });
  }

  private assignmentData(
    body: AdminBody,
    slotId?: string,
    tenantStoreId?: string,
  ) {
    return keepDefined({
      slotId: readString(body, 'slotId') ?? slotId,
      tenantStoreId: tenantStoreId ? parseBigIntId(tenantStoreId) : undefined,
      seasonYear: readNumber(body, 'seasonYear'),
      status: this.toAssignmentStatus(body.status),
      displayNameOverride: readNullableString(body, 'displayNameOverride'),
      publicNote: readNullableString(body, 'publicNote'),
      adminNote: readNullableString(body, 'adminNote'),
    });
  }

  private menuItemData(
    body: AdminBody,
    tenantStoreId?: string,
    fallbackName?: string,
  ) {
    return keepDefined({
      tenantStoreId: tenantStoreId ? parseBigIntId(tenantStoreId) : undefined,
      name: readString(body, 'name') ?? fallbackName,
      description: readNullableString(body, 'description'),
      category: readString(body, 'category'),
      basePriceKrw: readNumber(body, 'basePriceKrw'),
      basePriceText: readNullableString(body, 'basePriceText'),
      isSignature: readBoolean(body, 'isSignature'),
      isActive: readBoolean(body, 'isActive'),
      verificationStatus: readString(body, 'verificationStatus'),
    });
  }

  private offeringData(
    body: AdminBody,
    assignmentId?: string,
    menuItemId?: string,
  ) {
    return keepDefined({
      assignmentId: assignmentId ? parseBigIntId(assignmentId) : undefined,
      menuItemId: menuItemId ? parseBigIntId(menuItemId) : undefined,
      priceKrw: readNumber(body, 'priceKrw'),
      priceText: readNullableString(body, 'priceText'),
      saleStatus: this.toMenuSaleStatus(body.saleStatus),
      usesReusableContainer: this.toBooleanPolicy(body.usesReusableContainer),
      personalContainerAllowed: this.toBooleanPolicy(
        body.personalContainerAllowed,
      ),
      sortOrder: readNumber(body, 'sortOrder'),
      note: readNullableString(body, 'note'),
      verificationStatus: readString(body, 'verificationStatus'),
    });
  }

  private operatingRuleData(body: AdminBody, assignmentId?: string) {
    return keepDefined({
      assignmentId: assignmentId ? parseBigIntId(assignmentId) : undefined,
      ruleType: readString(body, 'ruleType') ?? 'TEXT_ONLY',
      openTime: readNullableString(body, 'openTime'),
      closeTime: readNullableString(body, 'closeTime'),
      textOverride: readNullableString(body, 'textOverride'),
      isActive: readBoolean(body, 'isActive'),
    });
  }

  private noticeData(
    body: AdminBody,
    fallbackTitle?: string,
    fallbackBody?: string,
  ) {
    return keepDefined({
      title: readString(body, 'title') ?? fallbackTitle,
      body: readString(body, 'body') ?? fallbackBody,
      noticeType: readString(body, 'noticeType') ?? 'GENERAL',
      isPublic: readBoolean(body, 'isPublic'),
      slotId: readNullableString(body, 'slotId'),
      tenantStoreId: readNullableString(body, 'tenantStoreId')
        ? parseBigIntId(readString(body, 'tenantStoreId') as string)
        : undefined,
      assignmentId: readNullableString(body, 'assignmentId')
        ? parseBigIntId(readString(body, 'assignmentId') as string)
        : undefined,
    });
  }

  private serializeSlot(slot: any) {
    const seatHints = Array.isArray(slot.seatSectionHints)
      ? slot.seatSectionHints.join(', ')
      : null;
    return {
      id: slot.id,
      stadiumCode: slot.stadiumCode,
      floor: slot.floor?.code ?? null,
      slotCode: slot.slotNo,
      officialSlotNo: slot.officialSlotNo,
      gate: slot.nearestGate?.code ?? null,
      category: slot.slotKind,
      xPct: slot.xPct,
      yPct: slot.yPct,
      sectionHint: seatHints,
      landmarkNote: slot.landmarkNote,
      isFoodMapVisible: slot.isFoodMapVisible,
      isCodeProvisional: slot.isCodeProvisional,
      verificationStatus: slot.verificationStatus,
      sourceConfidence: slot.sourceConfidence ?? 'LOW',
    };
  }

  private serializeTenantStore(store: any) {
    return {
      id: store.id.toString(),
      name: store.name,
      brandName: store.brandName,
      category: store.category,
      description: store.description,
      defaultHoursText: store.defaultHoursText,
      defaultReusableContainerPolicy: this.toPolicyChoice(
        store.defaultReusableContainerPolicy,
      ),
      defaultPersonalContainerPolicy: this.toPolicyChoice(
        store.defaultPersonalContainerPolicy,
      ),
      verificationStatus: 'NEEDS_REVIEW',
    };
  }

  private serializeAssignment(assignment: any) {
    const hoursText =
      assignment.operatingRules?.find((rule: any) => rule.textOverride)
        ?.textOverride ?? null;
    return {
      id: assignment.id.toString(),
      slotId: assignment.slotId,
      tenantStoreId: assignment.tenantStoreId.toString(),
      seasonYear: assignment.seasonYear,
      status: assignment.status,
      displayNameOverride: assignment.displayNameOverride,
      hoursText,
      publicNote: assignment.publicNote,
      verificationStatus: 'NEEDS_REVIEW',
    };
  }

  private serializeMenuItem(item: any) {
    return {
      id: item.id.toString(),
      tenantStoreId: item.tenantStoreId.toString(),
      name: item.name,
      category: item.category,
      description: item.description,
      basePriceKrw: item.basePriceKrw,
      basePriceText: item.basePriceText,
      isActive: item.isActive,
      isSignature: item.isSignature,
      verificationStatus: item.verificationStatus,
    };
  }

  private serializeOffering(offering: any) {
    return {
      id: offering.id.toString(),
      assignmentId: offering.assignmentId.toString(),
      menuItemId: offering.menuItemId.toString(),
      priceKrw: offering.priceKrw,
      priceText: offering.priceText,
      saleStatus: offering.saleStatus,
      sortOrder: offering.sortOrder,
      note: offering.note,
      usesReusableContainer: this.fromBooleanPolicy(
        offering.usesReusableContainer,
      ),
      personalContainerAllowed: this.fromBooleanPolicy(
        offering.personalContainerAllowed,
      ),
      verificationStatus: offering.verificationStatus,
    };
  }

  private serializeOperatingRule(rule: any) {
    return {
      id: rule.id.toString(),
      assignmentId: rule.assignmentId.toString(),
      ruleType: rule.ruleType,
      isActive: rule.isActive,
      openTime: rule.openTime,
      closeTime: rule.closeTime,
      textOverride: rule.textOverride,
      verificationStatus: 'NEEDS_REVIEW',
    };
  }

  private serializeNotice(notice: any) {
    return {
      id: notice.id.toString(),
      title: notice.title,
      body: notice.body,
      noticeType: notice.noticeType,
      isPublic: notice.isPublic,
      slotId: notice.slotId,
      tenantStoreId: notice.tenantStoreId?.toString() ?? null,
      assignmentId: notice.assignmentId?.toString() ?? null,
      verificationStatus: 'NEEDS_REVIEW',
    };
  }
}
