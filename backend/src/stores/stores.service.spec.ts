import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StoresService } from './stores.service';

const ContainerPolicy = {
  UNKNOWN: 'UNKNOWN',
  SUPPORTED: 'SUPPORTED',
} as const;

const MenuSaleStatus = {
  ON_SALE: 'ON_SALE',
} as const;

const StoreAssignmentStatus = {
  ACTIVE: 'ACTIVE',
} as const;

const StoreSide = {
  FIRST_BASE: 'FIRST_BASE',
} as const;

const StoreSlotKind = {
  FOOD: 'FOOD',
  CAFE: 'CAFE',
  CONVENIENCE: 'CONVENIENCE',
} as const;
type StoreSlotKind = (typeof StoreSlotKind)[keyof typeof StoreSlotKind];

type AnyFn = jest.Mock<unknown, unknown[]>;

interface PrismaStub {
  stadium: { findUnique: AnyFn };
  stadiumFloor: { findMany: AnyFn };
  storeAssignment: { findMany: AnyFn; findFirst: AnyFn };
  game: { findUnique: AnyFn };
  tenantStore: { findMany: AnyFn };
}

describe('StoresService', () => {
  let service: StoresService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = {
      stadium: { findUnique: jest.fn<unknown, unknown[]>() },
      stadiumFloor: { findMany: jest.fn<unknown, unknown[]>() },
      storeAssignment: {
        findMany: jest.fn<unknown, unknown[]>(),
        findFirst: jest.fn<unknown, unknown[]>(),
      },
      game: { findUnique: jest.fn<unknown, unknown[]>() },
      tenantStore: { findMany: jest.fn<unknown, unknown[]>() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [StoresService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(StoresService);
  });

  it('floor와 foodOnly를 public 조회 where에 반영한다', async () => {
    prisma.stadium.findUnique.mockResolvedValue({
      code: 'JAMSIL',
      name: '잠실야구장',
    });
    prisma.stadiumFloor.findMany.mockResolvedValue([]);
    prisma.storeAssignment.findMany.mockResolvedValue([]);

    await service.findStores({
      stadiumCode: 'JAMSIL',
      floor: '2F',
      foodOnly: true,
    });

    const call = prisma.storeAssignment.findMany.mock.calls[0][0] as {
      where: {
        slot: {
          floor: { code: string };
          slotKind: { in: StoreSlotKind[] };
        };
      };
    };

    expect(call.where.slot.floor.code).toBe('2F');
    expect(call.where.slot.slotKind.in).toEqual([
      StoreSlotKind.FOOD,
      StoreSlotKind.CAFE,
      StoreSlotKind.CONVENIENCE,
    ]);
  });

  it('public 응답은 bigint를 문자열로 바꾸고 admin 필드를 숨긴다', async () => {
    prisma.stadium.findUnique.mockResolvedValue({
      code: 'JAMSIL',
      name: '잠실야구장',
    });
    prisma.stadiumFloor.findMany.mockResolvedValue([
      { code: '2F', name: '2층', sortOrder: 20 },
    ]);
    prisma.storeAssignment.findMany.mockResolvedValue([
      {
        id: 91n,
        slotId: 'JAMSIL-B20',
        status: StoreAssignmentStatus.ACTIVE,
        startsOn: null,
        slot: {
          id: 'JAMSIL-B20',
          slotNo: 'B20',
          officialSlotNo: 'B20',
          isCodeProvisional: false,
          slotKind: StoreSlotKind.FOOD,
          side: StoreSide.FIRST_BASE,
          areaLabel: '2층 1루 내야 복도',
          xPct: 72,
          yPct: 56,
          landmarkNote: '1루 측 내부 복도',
          lastVerifiedAt: new Date('2026-05-22T00:00:00.000Z'),
          floor: { code: '2F', sortOrder: 20 },
          nearestGate: { code: 'GATE_2_3', name: 'GATE 2-3' },
        },
        tenantStore: {
          id: 12n,
          name: 'BBQ',
          brandName: 'BBQ',
          category: 'CHICKEN',
          defaultHoursText: '경기일 운영',
          defaultReusableContainerPolicy: ContainerPolicy.UNKNOWN,
          defaultPersonalContainerPolicy: ContainerPolicy.SUPPORTED,
          publicNote: null,
          adminOperatorName: 'internal',
          adminContact: '010-1234-5678',
          adminNote: 'admin only',
        },
        badgeLabel: '현장 확인',
        publicNote: null,
        displayNameOverride: null,
        menuOfferings: [
          {
            id: 1001n,
            menuItemId: 501n,
            priceKrw: null,
            priceText: '현장 확인',
            saleStatus: MenuSaleStatus.ON_SALE,
            usesReusableContainer: null,
            personalContainerAllowed: null,
            menuItem: {
              name: '대표 치킨 메뉴',
              category: 'MAIN',
              basePriceText: '현장 확인',
              isSignature: true,
            },
          },
        ],
        operatingRules: [
          {
            id: 301n,
            ruleType: 'GAME_DAY',
            dayOfWeek: null,
            specialDate: null,
            openTime: null,
            closeTime: null,
            openMinutesBeforeGame: null,
            closeTiming: null,
            lastOrderTime: null,
            textOverride: '경기일 운영',
          },
        ],
        notices: [],
      },
    ]);

    const result = await service.findStores({ stadiumCode: 'JAMSIL' });

    expect(result.source.lastVerifiedAt).toBe('2026-05-22T00:00:00.000Z');
    expect(result.stores[0]).toMatchObject({
      assignmentId: '91',
      slot: {
        id: 'JAMSIL-B20',
        floorCode: '2F',
      },
      tenant: {
        id: '12',
        name: 'BBQ',
        reusableContainerPolicy: ContainerPolicy.UNKNOWN,
        personalContainerPolicy: ContainerPolicy.SUPPORTED,
      },
      menus: [
        expect.objectContaining({
          offeringId: '1001',
          menuItemId: '501',
        }),
      ],
      operatingRules: [
        expect.objectContaining({
          id: '301',
        }),
      ],
    });
    expect(result.stores[0].tenant).not.toHaveProperty('adminOperatorName');
    expect(result.stores[0].tenant).not.toHaveProperty('adminContact');
    expect(result.stores[0].tenant).not.toHaveProperty('adminNote');
  });
});
