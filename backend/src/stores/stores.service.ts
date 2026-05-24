import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FindStoresDto } from './dto/find-stores.dto';
import { FindTenantStoresDto } from './dto/find-tenant-stores.dto';
import { parseBigIntId } from './stores.utils';

const StoreSlotKind = {
  FOOD: 'FOOD',
  CAFE: 'CAFE',
  CONVENIENCE: 'CONVENIENCE',
} as const;
type StoreSlotKind = (typeof StoreSlotKind)[keyof typeof StoreSlotKind];

const StoreAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  TEMP_CLOSED: 'TEMP_CLOSED',
  PLANNED: 'PLANNED',
  ENDED: 'ENDED',
} as const;
type StoreAssignmentStatus =
  (typeof StoreAssignmentStatus)[keyof typeof StoreAssignmentStatus];

const MenuSaleStatus = {
  HIDDEN: 'HIDDEN',
} as const;

const FOOD_SLOT_KINDS: StoreSlotKind[] = [
  StoreSlotKind.FOOD,
  StoreSlotKind.CAFE,
  StoreSlotKind.CONVENIENCE,
];

const PUBLIC_ASSIGNMENT_STATUSES: StoreAssignmentStatus[] = [
  StoreAssignmentStatus.ACTIVE,
  StoreAssignmentStatus.TEMP_CLOSED,
  StoreAssignmentStatus.PLANNED,
];

const publicAssignmentInclude = (now: Date) => ({
  slot: {
    include: {
      floor: true,
      nearestGate: true,
    },
  },
  tenantStore: true,
  menuOfferings: {
    where: {
      saleStatus: {
        not: MenuSaleStatus.HIDDEN,
      },
    },
    include: {
      menuItem: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
  operatingRules: {
    where: {
      isActive: true,
    },
    orderBy: [{ ruleType: 'asc' }, { id: 'asc' }],
  },
  notices: {
    where: {
      isPublic: true,
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  },
});

type PublicAssignmentRecord = any;

type TenantStoreSearchRecord = any;

@Injectable()
export class StoresService {
  private readonly sourceVersion = '2026-jamsil-food-map-v1';

  constructor(private readonly prisma: PrismaService) {}

  async findFloors(stadiumCode: string) {
    const stadium = await this.prisma.stadium.findUnique({
      where: { code: stadiumCode },
      select: { code: true },
    });

    if (!stadium) {
      throw new NotFoundException('구장을 찾을 수 없습니다');
    }

    const floors = await this.prisma.stadiumFloor.findMany({
      where: {
        stadiumCode,
        isPublic: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return floors.map((floor) => ({
      code: floor.code,
      name: floor.name,
      sortOrder: floor.sortOrder,
      mapImageUrl: floor.mapImageUrl,
      mapWidth: floor.mapWidth,
      mapHeight: floor.mapHeight,
    }));
  }

  async findStores(query: FindStoresDto) {
    const stadiumCode = query.stadiumCode ?? 'JAMSIL';
    const gameDate = await this.resolveGameDate(query.gameId);
    const now = new Date();

    const [stadium, floors, assignments] = await Promise.all([
      this.prisma.stadium.findUnique({
        where: { code: stadiumCode },
      }),
      this.prisma.stadiumFloor.findMany({
        where: {
          stadiumCode,
          isPublic: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
      this.prisma.storeAssignment.findMany({
        where: this.buildPublicAssignmentWhere({
          stadiumCode,
          floor: query.floor,
          foodOnly: query.foodOnly ?? true,
          gameDate,
        }),
        include: publicAssignmentInclude(now) as any,
      }),
    ]);

    if (!stadium) {
      throw new NotFoundException('구장을 찾을 수 없습니다');
    }

    const selectedAssignments = this.pickPreferredAssignments(assignments).sort(
      (left, right) => this.compareBySlot(left, right),
    );
    const lastVerifiedAt = this.getLatestVerifiedAt(selectedAssignments);

    return {
      stadium: {
        code: stadium.code,
        name: stadium.name,
      },
      source: {
        version: this.sourceVersion,
        lastVerifiedAt: lastVerifiedAt?.toISOString() ?? null,
      },
      floors: floors.map((floor) => ({
        code: floor.code,
        name: floor.name,
        sortOrder: floor.sortOrder,
      })),
      stores: selectedAssignments.map((assignment) =>
        this.serializePublicAssignment(assignment),
      ),
    };
  }

  async findStoreDetail(assignmentId: string) {
    const now = new Date();
    const assignment = await this.prisma.storeAssignment.findFirst({
      where: {
        id: parseBigIntId(assignmentId, 'assignmentId'),
        status: {
          in: PUBLIC_ASSIGNMENT_STATUSES,
        },
        slot: {
          isActive: true,
          isFoodMapVisible: true,
        },
      },
      include: publicAssignmentInclude(now) as any,
    });

    if (!assignment) {
      throw new NotFoundException('매장 배정을 찾을 수 없습니다');
    }

    return this.serializePublicAssignment(assignment);
  }

  async findTenantStores(query: FindTenantStoresDto) {
    const stadiumCode = query.stadiumCode ?? 'JAMSIL';
    const tenantStores = await this.prisma.tenantStore.findMany({
      where: {
        ...(query.query
          ? {
              OR: [
                {
                  name: {
                    contains: query.query,
                    mode: 'insensitive',
                  },
                },
                {
                  brandName: {
                    contains: query.query,
                    mode: 'insensitive',
                  },
                },
                {
                  menuItems: {
                    some: {
                      isActive: true,
                      name: {
                        contains: query.query,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {}),
        assignments: {
          some: this.buildTenantStoreAssignmentWhere({
            stadiumCode,
            floor: query.floor,
            gate: query.gate,
          }),
        },
      },
      include: {
        assignments: {
          where: this.buildTenantStoreAssignmentWhere({
            stadiumCode,
            floor: query.floor,
            gate: query.gate,
          }),
          include: {
            slot: {
              include: {
                floor: true,
                nearestGate: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }],
        },
        menuItems: {
          where: {
            isActive: true,
          },
          orderBy: [{ isSignature: 'desc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return tenantStores.map((tenantStore) =>
      this.serializeTenantStoreSearchResult(tenantStore),
    );
  }

  private async resolveGameDate(gameId?: string) {
    if (!gameId) {
      return undefined;
    }

    const game = await this.prisma.game.findUnique({
      where: {
        id: parseBigIntId(gameId, 'gameId'),
      },
      select: {
        date: true,
      },
    });

    if (!game) {
      throw new NotFoundException('경기를 찾을 수 없습니다');
    }

    return game.date;
  }

  private buildPublicAssignmentWhere({
    stadiumCode,
    floor,
    foodOnly,
    gameDate,
  }: {
    stadiumCode: string;
    floor?: string;
    foodOnly: boolean;
    gameDate?: Date;
  }): any {
    const where: any = {
      status: {
        in: PUBLIC_ASSIGNMENT_STATUSES,
      },
      slot: {
        stadiumCode,
        isActive: true,
        isFoodMapVisible: true,
        ...(floor
          ? {
              floor: {
                code: floor,
              },
            }
          : {}),
        ...(foodOnly
          ? {
              slotKind: {
                in: FOOD_SLOT_KINDS,
              },
            }
          : {}),
      },
    };

    if (!gameDate) {
      return where;
    }

    return {
      ...where,
      AND: [
        {
          OR: [{ startsOn: null }, { startsOn: { lte: gameDate } }],
        },
        {
          OR: [{ endsOn: null }, { endsOn: { gte: gameDate } }],
        },
      ],
    };
  }

  private buildTenantStoreAssignmentWhere({
    stadiumCode,
    floor,
    gate,
  }: {
    stadiumCode: string;
    floor?: string;
    gate?: string;
  }): any {
    return {
      status: {
        in: PUBLIC_ASSIGNMENT_STATUSES,
      },
      slot: {
        stadiumCode,
        isActive: true,
        isFoodMapVisible: true,
        ...(floor
          ? {
              floor: {
                code: floor,
              },
            }
          : {}),
        ...(gate
          ? {
              nearestGate: {
                code: gate,
              },
            }
          : {}),
      },
    };
  }

  private pickPreferredAssignments(assignments: PublicAssignmentRecord[]) {
    const bySlot = new Map<string, PublicAssignmentRecord[]>();

    for (const assignment of assignments) {
      const current = bySlot.get(assignment.slotId) ?? [];
      current.push(assignment);
      bySlot.set(assignment.slotId, current);
    }

    return Array.from(bySlot.values()).map(
      (items) =>
        [...items].sort((left, right) =>
          this.compareAssignments(left, right),
        )[0],
    );
  }

  private compareAssignments(
    left: PublicAssignmentRecord,
    right: PublicAssignmentRecord,
  ) {
    const statusDiff =
      this.getAssignmentPriority(left.status) -
      this.getAssignmentPriority(right.status);
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const startsOnDiff =
      (right.startsOn?.getTime() ?? 0) - (left.startsOn?.getTime() ?? 0);
    if (startsOnDiff !== 0) {
      return startsOnDiff;
    }

    if (left.id === right.id) {
      return 0;
    }

    return left.id > right.id ? -1 : 1;
  }

  private compareBySlot(
    left: PublicAssignmentRecord,
    right: PublicAssignmentRecord,
  ) {
    const floorDiff = left.slot.floor.sortOrder - right.slot.floor.sortOrder;
    if (floorDiff !== 0) {
      return floorDiff;
    }

    const slotDiff = left.slot.slotNo.localeCompare(right.slot.slotNo, 'ko');
    if (slotDiff !== 0) {
      return slotDiff;
    }

    return this.compareAssignments(left, right);
  }

  private getAssignmentPriority(status: StoreAssignmentStatus) {
    switch (status) {
      case StoreAssignmentStatus.ACTIVE:
        return 0;
      case StoreAssignmentStatus.TEMP_CLOSED:
        return 1;
      case StoreAssignmentStatus.PLANNED:
        return 2;
      case StoreAssignmentStatus.ENDED:
      default:
        return 3;
    }
  }

  private getLatestVerifiedAt(assignments: PublicAssignmentRecord[]) {
    return assignments.reduce<Date | null>((latest, assignment) => {
      if (!assignment.slot.lastVerifiedAt) {
        return latest;
      }

      if (!latest || latest < assignment.slot.lastVerifiedAt) {
        return assignment.slot.lastVerifiedAt;
      }

      return latest;
    }, null);
  }

  private serializePublicAssignment(assignment: PublicAssignmentRecord) {
    const primaryHoursText =
      assignment.operatingRules.find((rule) => rule.textOverride)
        ?.textOverride ??
      assignment.tenantStore.defaultHoursText ??
      null;

    return {
      assignmentId: assignment.id.toString(),
      slot: {
        id: assignment.slot.id,
        slotNo: assignment.slot.slotNo,
        officialSlotNo: assignment.slot.officialSlotNo,
        isCodeProvisional: assignment.slot.isCodeProvisional,
        floorCode: assignment.slot.floor.code,
        slotKind: assignment.slot.slotKind,
        nearestGate: assignment.slot.nearestGate
          ? {
              code: assignment.slot.nearestGate.code,
              name: assignment.slot.nearestGate.name,
            }
          : null,
        side: assignment.slot.side,
        areaLabel: assignment.slot.areaLabel,
        map: {
          xPct: assignment.slot.xPct,
          yPct: assignment.slot.yPct,
        },
        landmarkNote: assignment.slot.landmarkNote,
      },
      tenant: {
        id: assignment.tenantStore.id.toString(),
        name: assignment.displayNameOverride ?? assignment.tenantStore.name,
        brandName: assignment.tenantStore.brandName,
        category: assignment.tenantStore.category,
        status: assignment.status,
        hoursText: primaryHoursText,
        badgeLabel: assignment.badgeLabel,
        publicNote: assignment.publicNote ?? assignment.tenantStore.publicNote,
        reusableContainerPolicy:
          assignment.tenantStore.defaultReusableContainerPolicy,
        personalContainerPolicy:
          assignment.tenantStore.defaultPersonalContainerPolicy,
      },
      menus: assignment.menuOfferings.map((offering) => ({
        offeringId: offering.id.toString(),
        menuItemId: offering.menuItemId.toString(),
        name: offering.menuItem.name,
        category: offering.menuItem.category,
        priceKrw: offering.priceKrw,
        priceText: offering.priceText ?? offering.menuItem.basePriceText,
        isSignature: offering.menuItem.isSignature,
        saleStatus: offering.saleStatus,
        usesReusableContainer: offering.usesReusableContainer,
        personalContainerAllowed: offering.personalContainerAllowed,
      })),
      operatingRules: assignment.operatingRules.map((rule) => ({
        id: rule.id.toString(),
        ruleType: rule.ruleType,
        dayOfWeek: rule.dayOfWeek,
        specialDate: rule.specialDate?.toISOString().slice(0, 10) ?? null,
        openTime: rule.openTime,
        closeTime: rule.closeTime,
        openMinutesBeforeGame: rule.openMinutesBeforeGame,
        closeTiming: rule.closeTiming,
        lastOrderTime: rule.lastOrderTime,
        textOverride: rule.textOverride,
      })),
      notices: assignment.notices.map((notice) => ({
        id: notice.id.toString(),
        title: notice.title,
        body: notice.body,
        noticeType: notice.noticeType,
        startsAt: notice.startsAt?.toISOString() ?? null,
        endsAt: notice.endsAt?.toISOString() ?? null,
        isPinned: notice.isPinned,
      })),
    };
  }

  private serializeTenantStoreSearchResult(
    tenantStore: TenantStoreSearchRecord,
  ) {
    return {
      id: tenantStore.id.toString(),
      name: tenantStore.name,
      brandName: tenantStore.brandName,
      category: tenantStore.category,
      description: tenantStore.description,
      publicNote: tenantStore.publicNote,
      defaultHoursText: tenantStore.defaultHoursText,
      reusableContainerPolicy: tenantStore.defaultReusableContainerPolicy,
      personalContainerPolicy: tenantStore.defaultPersonalContainerPolicy,
      assignments: tenantStore.assignments.map((assignment) => ({
        assignmentId: assignment.id.toString(),
        status: assignment.status,
        badgeLabel: assignment.badgeLabel,
        publicNote: assignment.publicNote,
        slot: {
          id: assignment.slot.id,
          slotNo: assignment.slot.slotNo,
          floorCode: assignment.slot.floor.code,
          areaLabel: assignment.slot.areaLabel,
          nearestGate: assignment.slot.nearestGate
            ? {
                code: assignment.slot.nearestGate.code,
                name: assignment.slot.nearestGate.name,
              }
            : null,
        },
      })),
      menuItems: tenantStore.menuItems.map((menuItem) => ({
        id: menuItem.id.toString(),
        name: menuItem.name,
        category: menuItem.category,
        basePriceKrw: menuItem.basePriceKrw,
        basePriceText: menuItem.basePriceText,
        isSignature: menuItem.isSignature,
      })),
    };
  }
}
