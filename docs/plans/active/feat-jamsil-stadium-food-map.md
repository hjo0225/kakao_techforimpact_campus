# 잠실야구장 내부 식음료 매장 지도 구현 문서

## Context

현재 `MapScreen`은 프론트엔드 내부 mock 상수(`STORES`, `PARTNER_RESTAURANTS`)와 SVG 좌표만으로 매장 위치를 표현한다. 백엔드에는 매장 관련 모델, API, 시드가 아직 없다.

이번 기능의 핵심은 잠실야구장 내부 식음료 매장을 최대한 실제 구조에 가깝게 보여 주되, 운영 현실에 맞게 **물리적으로 고정된 매장 위치**와 **입점 가게**를 분리하는 것이다.

- 고정 매장 위치: 층, 매장번호(A27, B10 등), 좌표, 가까운 게이트, 구역 같은 정적 정보
- 입점 가게: 브랜드/가게명, 영업시간, 메뉴, 다회용기/개인용기 정책, 비고 같은 유동 정보
- 배정: 특정 기간에 어떤 가게가 어떤 매장 위치에 들어가는지 연결하는 운영 정보

## 현재 코드베이스 기준

### Frontend

- 대상 화면: `frontend/src/app/components/screens/MapScreen.tsx`
- 현재 구조: `StatusBar -> 구장/좌석 요약 + SVG 미니맵 -> 구장 내부/외부 식당 탭 -> 선택 매장 상세 -> 리스트 -> BottomNav`
- 현재 데이터 흐름:
  - `selectedGame`, `seatInfo`만 `AppContext`에서 읽는다.
  - 지도 데이터는 모두 `MapScreen.tsx` 내부 상수다.
  - 실제 좌석 기반 위치 계산, 층별 오버레이, API 연동은 없다.
- 현재 스타일:
  - 인라인 스타일 중심
  - `var(--cb-bg-soft)`, `var(--cb-primary-soft)`, `var(--cb-primary-border)` 등 기존 픽셀/카드 스타일 사용
  - `lucide-react` 아이콘 사용

### Backend

- 프레임워크: NestJS
- ORM/DB: Prisma + PostgreSQL
- DB SSOT: `backend/prisma/schema.prisma`
- API 패턴: `Controller -> DTO -> Service -> PrismaService`
- 시드 패턴: `backend/prisma/seed.ts`에서 마스터 데이터는 `upsert`, 벌크 데이터는 `createMany + skipDuplicates`
- 관련 문서:
  - `docs/DATA_MODEL.md`
  - `docs/api-spec.md`
  - `docs/ARCHITECTURE.md`

## 데이터 소스와 신뢰도

### 1차 소스

- `ref/1층 구조도.png`
- `ref/2층 구조도.png`
- `ref/2.5층 구조도.png`
- `ref/3:4층 구조도.png`
- `ref/아모제1층.avif`
- `ref/아모제2,2.5층.avif`
- `ref/아모제3,4층.avif`

이 자료는 매장번호, 층, 위치, 일부 시설 타입을 정하는 기준으로 사용한다. 단, 이미지 좌표는 사람이 수동으로 보정해야 한다.

### SVG 레이어 참고 자료

아모제 AVIF 3장은 실제 앱용 구조도라기보다, **단순화된 SVG 배경 레이어 스타일의 참고 자료**로 유용하다.

- `아모제1층.avif`: 1F를 A/B/C 구역 컬러 아크로 나누고, 중앙 경기장 형태와 매장번호 원형 마커를 얹는 구성
- `아모제2,2.5층.avif`: 2F/2.5F를 U자형 콘코스와 작은 주황색 번호 사각형으로 표현
- `아모제3,4층.avif`: 3F/4F를 같은 U자형 콘코스 위에 초록색 번호 사각형으로 표현

이 스타일은 Figma에서 먼저 따지 않아도 프론트엔드 SVG로 직접 구현 가능하다. 다만 아모제 도면의 매장 번호는 기존 `A01/B01/C01/D01` 구조도와 번호 체계가 다르므로, 데이터 SSOT로 쓰지 않는다. 지도 배경 형태, 마커 스타일, 범례 배치만 참고한다.

### 공개 보강 자료

- `https://blog.naver.com/zero_seoul_official/223425395998`: 서울시 기후환경본부 Zero Seoul 공식 블로그 글. 제목은 `잠실야구장에서 다회용기 쓰고 환경보호를 위한 '용기' 내주세요!｜반납함 위치｜가능 매장`, 게시일은 2024-04-24다. 글 본문에서 잠실야구장 38개 식음료 판매업체에 다회용기를 도입했다고 안내한다. 다회용기 참여 매장/메뉴 확인의 우선 출처로 두되, 2026년 현재 운영 상태는 운영자가 수동 검증해 입력한다.
- `https://simplelife100.tistory.com/2056`: 2026년 잠실야구장 층별 먹거리 정리 글. 두산베어스 공식 안내 지도를 기반으로 작성했다고 밝히고, 층별 매장 설명을 제공한다.
- `https://www.newsis.com/view/NISX20251218_0003446420`: 2025년 12월 18일 뉴시스 기사. GS25가 잠실야구장 내 편의점 운영권 우선협상대상자로 선정되었고, 최종 협상 시 2026년 1월 1일부터 2027년 12월 31일까지 12개 편의점을 운영하게 된다고 보도했다.
- `https://humanlogos.tistory.com/464`: 2025년 잠실야구장 층별 먹거리 정리 글. 일부 매장명은 최신 구조도와 다를 수 있어 보조 비교 자료로만 사용한다.

### 운영 정책

- 매장번호/층/위치/게이트는 ref 구조도를 우선한다.
- 입점 가게명은 ref 구조도를 우선하고, 공개 자료로 오탈자와 최신성을 보강한다.
- 다회용기 참여 매장/메뉴는 Zero Seoul 공식 블로그를 우선 출처로 삼되, 자동으로 완성할 수 없는 항목은 운영자가 현장/수동 확인 후 입력한다.
- 메뉴명과 가격은 변동성이 높고 현재 확보된 구조도만으로는 알 수 없으므로, 공식 브랜드 메뉴/현장 검증/운영자 입력 전까지 `priceKrw = null`, `priceText = "현장 확인"`로 둘 수 있게 설계한다.
- 다회용기 사용 여부와 개인용기 가능 여부는 메뉴별 예외가 많을 수 있으므로, 매장 기본 정책과 메뉴별 override를 모두 지원한다.
- 경기일/비경기일 영업시간은 운영자 입력 데이터로 취급한다.

## 도메인 모델 결정

### 핵심 원칙

1. `A27`, `B10` 같은 번호는 가게 ID가 아니라 **물리적 슬롯 번호**다.
2. `맘스터치`, `BBQ`, `GS25` 같은 브랜드는 **입점 가게**다.
3. 어느 기간에 어느 슬롯에 어떤 가게가 들어왔는지는 **배정 이력**으로 관리한다.
4. 층과 게이트는 문자열 필드만으로 끝내지 않고 별도 마스터로 둔다. `2.5F`와 게이트 기준 추천/필터를 안정적으로 처리하기 위해서다.
5. 메뉴는 `입점 가게의 기본 메뉴`와 `특정 슬롯 배정에서 실제 판매되는 메뉴`를 분리한다. 같은 브랜드라도 위치별 가격, 품절, 다회용기 정책이 다를 수 있기 때문이다.
6. 영업시간은 텍스트 하나로만 두지 않고 경기일/비경기일/특정일/텍스트 규칙을 담는 운영 규칙으로 확장 가능해야 한다.
7. DB에는 UI 색상값을 넣지 않는다. `status`, `slotKind`, `containerPolicy` 같은 의미값을 내려 주고 프론트에서 스타일링한다.

### 엔티티 개요

| 엔티티 | 역할 | 예시 |
|---|---|---|
| `stadiums` | 구장 마스터 | `JAMSIL`, 잠실야구장 |
| `stadium_floors` | 구장별 층/지도 마스터 | `1F`, `2F`, `2.5F`, `3F`, `4F` |
| `stadium_gates` | 구장별 게이트/출입구 마스터 | `GATE 1-1`, `GATE 2-3` |
| `store_slots` | 고정 매장 위치 | `JAMSIL-A27`, 1F, 중앙 매표소 근처 |
| `tenant_stores` | 입점 가게/브랜드 | `BBQ`, `GS25`, `통밥` |
| `store_assignments` | 슬롯과 입점 가게의 기간별 연결 | 2026 시즌 `JAMSIL-B20`에 `BBQ` |
| `tenant_menu_items` | 입점 가게의 기본 메뉴 | BBQ 후라이드, GS25 음료 |
| `store_menu_offerings` | 특정 배정에서 실제 판매되는 메뉴 | B20 BBQ 후라이드 22,000원 |
| `store_operating_rules` | 배정별 영업시간 규칙 | 경기 시작 120분 전부터 경기 종료까지 |
| `store_notices` | 슬롯/가게/배정별 공지 | 임시 휴무, 품절, 메뉴 변경 |

## 추천 데이터 필드

### 층/지도: `stadium_floors`

필수:

- `stadiumCode`: `JAMSIL`
- `code`: `1F`, `2F`, `2.5F`, `3F`, `4F`
- `name`: `1층`, `2층`, `2.5층`
- `sortOrder`: `10`, `20`, `25`, `30`, `40`
- `isPublic`: 사용자 화면 노출 여부

권장:

- `mapImageUrl`: ref 이미지를 정제해 쓸 경우의 지도 이미지 경로
- `mapWidth`, `mapHeight`: 기준 이미지 크기
- `sourceRef`
- `note`

### 게이트/출입구: `stadium_gates`

필수:

- `stadiumCode`: `JAMSIL`
- `floorCode`: 주로 연결되는 층
- `code`: 내부 코드. 예: `GATE_1_1`, `GATE_2_3`, `FIRST_BASE_INFIELD`
- `name`: 사용자 표시명. 예: `GATE 1-1`, `1루 내야 출입구`
- `gateType`: `MAIN`, `INNER`, `OUTFIELD`, `STAIR`, `UNKNOWN`

권장:

- `xPct`, `yPct`: 지도 이미지 기준 0-100 정규화 좌표
- `note`

초기 게이트 후보:

- 1F: `GATE 1-1`, `GATE 1-2`, `GATE 1-5`, `1루 내야 출입구`, `3루 내야 출입구`, `1루 외야 출입구`, `3루 외야 출입구`, `출입구5`, `출입구6`
- 2F: `GATE 2-1`, `GATE 2-2`, `GATE 2-3`

### 고정 매장 위치: `store_slots`

필수:

- `id`: 내부 ID. 예: `JAMSIL-A27`
- `stadiumCode`: `JAMSIL`
- `slotNo`: 구조도 번호. 예: `A27`, `B10`
- `officialSlotNo`: 공식 번호가 확인된 경우의 원본 번호. 4F는 `null`
- `isCodeProvisional`: 공식 번호가 없어 임의 부여한 코드인지 여부. 4F는 `true`
- `floorCode`: `1F`, `2F`, `2.5F`, `3F`, `4F`
- `slotKind`: `FOOD`, `CAFE`, `CONVENIENCE`, `GOODS`, `TICKET`, `INFO`, `FAMILY`, `OTHER`
- `nearestGateCode`: 가장 가까운 게이트 또는 출입구. 예: `GATE_2_3`
- `side`: `FIRST_BASE`, `THIRD_BASE`, `CENTER`, `OUTFIELD`, `UNKNOWN`
- `areaLabel`: 사용자 표시용 위치. 예: `2층 1루 내야 복도`
- `xPct`, `yPct`: 층별 구조도 기준 0-100 정규화 좌표
- `isFoodMapVisible`: 식음료 지도에 표시할지 여부
- `isActive`: 현재 사용 중인 슬롯인지 여부
- `sourceRef`: `ref/2층 구조도.png`
- `sourceUrl`: 공개 웹 출처가 있을 때 URL

권장:

- `seatSectionHints`: 가까운 좌석 구역. 예: `["301", "302", "303"]`
- `polygonSvgPath`: 마커가 아니라 구역 전체를 클릭 가능하게 만들 때 사용
- `labelXOffset`, `labelYOffset`, `rotationDeg`: 복잡한 도면에서 라벨 위치 보정
- `accessNote`: 층간 이동, 외부/내부 여부, 입장 전 이용 가능 여부
- `landmarkNote`: `화장실 옆`, `전광판 뒤`, `트윈스존 인근`
- `walkingDifficulty`: `LOW`, `MEDIUM`, `HIGH`
- `queueAreaNote`: 줄 서는 위치 안내
- `sourceConfidence`: `HIGH`, `MEDIUM`, `LOW`
- `verificationStatus`: `DRAFT`, `NEEDS_REVIEW`, `VERIFIED`
- `lastVerifiedAt`: 현장/운영자 확인 일시

### 입점 가게: `tenant_stores`

필수:

- `id`
- `name`: 표시명. 예: `맘스터치`
- `brandName`: 브랜드 표준명. 예: `MOM'S TOUCH`
- `category`: `CHICKEN`, `BURGER`, `CAFE`, `CONVENIENCE`, `KOREAN_SNACK`, `BEER`, `GOODS`, `TICKET`, `OTHER`
- `defaultHoursText`: 기본 영업시간 텍스트
- `defaultReusableContainerPolicy`
- `defaultPersonalContainerPolicy`

권장:

- `description`: 짧은 설명
- `tags`: `["치킨", "맥주", "빠른주문", "아이동반"]`
- `defaultPaymentMethods`: `["CARD", "MOBILE_PAY"]`
- `isFranchise`
- `brandGroup`
- `officialUrl`
- `instagramUrl`
- `logoUrl`
- `imageUrls`
- `operatorDisplayName`: 운영자 공개명이 있을 때만
- `adminOperatorName`: 내부 관리용. 공개 API에는 내려 주지 않는다.
- `adminContact`: 내부 관리용 연락처

대표자 정보는 소비자 지도 기능에는 필요도가 낮고 개인정보/운영정보 성격이 강하다. MVP에서는 공개 응답에 포함하지 말고, 필요하면 관리자 전용 필드로 분리한다.

### 배정: `store_assignments`

필수:

- `id`
- `slotId`
- `tenantStoreId`
- `seasonYear`
- `status`: `ACTIVE`, `PLANNED`, `TEMP_CLOSED`, `ENDED`
- `startsOn`
- `endsOn`
- `displayNameOverride`: 복합 매장/팝업 표시명 오버라이드
- `hoursText`: 이 슬롯에서의 영업시간

권장:

- `gameDayHoursText`: 경기일 영업시간
- `nonGameDayHoursText`: 비경기일 영업시간
- `lastOrderText`
- `badgeLabel`: `영업 중`, `경기일 운영`, `현장 확인`
- `publicNote`: 사용자에게 보여 줄 비고
- `adminNote`: 내부 비고
- `sourceUrl`
- `sourceRef`
- `sourceConfidence`

동시 활성 배정 제약:

- 같은 `slotId`에는 `ACTIVE` 배정이 동시에 2개 이상 있으면 안 된다.
- PostgreSQL에서는 partial unique index로 강제한다: `CREATE UNIQUE INDEX ... ON store_assignments(slot_id) WHERE status = 'ACTIVE'`.
- Prisma schema만으로 표현이 부족하면 migration SQL에 수동으로 추가한다.

### 기본 메뉴: `tenant_menu_items`

필수:

- `id`
- `tenantStoreId`
- `name`
- `category`: `MAIN`, `SIDE`, `DRINK`, `ALCOHOL`, `DESSERT`, `SET`, `OTHER`
- `basePriceKrw`: 정수. 모르면 `null`
- `basePriceText`: `9,800원`, `현장 확인`, `시가`
- `isActive`

권장:

- `description`
- `imageUrl`
- `isSignature`
- `allergenTags`
- `dietaryTags`
- `spicyLevel`
- `isAlcohol`
- `isAgeRestricted`
- `sourceUrl`
- `sourceRef`
- `sourceConfidence`
- `verificationStatus`: `DRAFT`, `NEEDS_REVIEW`, `VERIFIED`

### 판매 메뉴: `store_menu_offerings`

필수:

- `id`
- `assignmentId`
- `menuItemId`
- `priceKrw`: 정수. 모르면 `null`
- `priceText`: `9,800원`, `현장 확인`, `시가`
- `saleStatus`: `ON_SALE`, `SOLD_OUT`, `HIDDEN`
- `sortOrder`
- `sourceUrl`
- `sourceRef`
- `sourceConfidence`
- `verificationStatus`: `DRAFT`, `NEEDS_REVIEW`, `VERIFIED`

권장:

- `isRepresentative`: 대표 메뉴 여부
- `usesReusableContainer`: 해당 메뉴 다회용기 제공 여부
- `personalContainerAllowed`: 개인용기 가능 여부
- `reusableContainerRequired`: 다회용기 필수 메뉴인지 여부
- `containerDepositKrw`: 보증금
- `personalContainerDiscountKrw`: 개인용기 할인 금액
- `containerType`: `BOWL`, `CUP`, `PLATE`, `BOX`, `UNKNOWN`
- `estimatedPrepMinutes`
- `isPopular`
- `dailyStockLimit`
- `remainingStock`
- `note`

다회용기와 개인용기 정책은 매장 단위 기본값을 두고, 메뉴별 예외를 override하는 방식이 가장 운영하기 쉽다.

### 영업시간 규칙: `store_operating_rules`

필수:

- `id`
- `assignmentId`
- `ruleType`: `ALL_DAYS`, `GAME_DAY`, `NON_GAME_DAY`, `WEEKDAY`, `WEEKEND`, `SPECIAL_DATE`, `TEXT_ONLY`
- `isActive`

권장:

- `dayOfWeek`: `0`-`6`
- `specialDate`
- `openTime`, `closeTime`: `HH:MM`
- `openMinutesBeforeGame`: 경기 시작 몇 분 전
- `closeTiming`: `GAME_END`, `SEVENTH_INNING`, `CUSTOM_TIME`
- `lastOrderTime`
- `textOverride`: `경기 시작 2시간 전부터 경기 종료 시까지`

### 공지: `store_notices`

필수:

- `id`
- `title`
- `body`
- `noticeType`: `GENERAL`, `TEMP_CLOSED`, `SOLD_OUT`, `EVENT`, `DELAY`, `MENU_CHANGED`
- `isPublic`

권장:

- `tenantStoreId`
- `assignmentId`
- `slotId`
- `startsAt`, `endsAt`
- `isPinned`

## Prisma 초안

```prisma
enum StoreSlotKind {
  FOOD
  CAFE
  CONVENIENCE
  GOODS
  TICKET
  INFO
  FAMILY
  OTHER
}

enum StoreSide {
  FIRST_BASE
  THIRD_BASE
  CENTER
  OUTFIELD
  INFIELD
  UNKNOWN
}

enum StoreAssignmentStatus {
  ACTIVE
  PLANNED
  TEMP_CLOSED
  ENDED
}

enum ContainerPolicy {
  UNKNOWN
  SUPPORTED
  NOT_SUPPORTED
  MENU_DEPENDENT
}

enum MenuSaleStatus {
  ON_SALE
  SOLD_OUT
  HIDDEN
}

model Stadium {
  code      String   @id
  name      String
  shortName String   @map("short_name")
  address   String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  floors StadiumFloor[]
  gates  StadiumGate[]
  slots  StoreSlot[]

  @@map("stadiums")
}

model StadiumFloor {
  id          String   @id
  stadiumCode String   @map("stadium_code")
  code        String
  name        String
  sortOrder   Int      @map("sort_order")
  mapImageUrl String?  @map("map_image_url")
  mapWidth    Int?     @map("map_width")
  mapHeight   Int?     @map("map_height")
  isPublic    Boolean  @default(true) @map("is_public")
  sourceRef   String?  @map("source_ref")
  note        String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  stadium Stadium      @relation(fields: [stadiumCode], references: [code])
  gates   StadiumGate[]
  slots   StoreSlot[]

  @@unique([stadiumCode, code])
  @@map("stadium_floors")
}

model StadiumGate {
  id          String   @id
  stadiumCode String   @map("stadium_code")
  floorId     String?  @map("floor_id")
  code        String
  name        String
  gateType    String   @default("UNKNOWN") @map("gate_type")
  xPct        Float?   @map("x_pct")
  yPct        Float?   @map("y_pct")
  note        String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  stadium Stadium       @relation(fields: [stadiumCode], references: [code])
  floor   StadiumFloor? @relation(fields: [floorId], references: [id])
  slots   StoreSlot[]

  @@unique([stadiumCode, code])
  @@index([floorId])
  @@map("stadium_gates")
}

model StoreSlot {
  id                 String        @id
  stadiumCode        String        @map("stadium_code")
  floorId            String        @map("floor_id")
  nearestGateId      String?       @map("nearest_gate_id")
  slotNo             String        @map("slot_no")
  officialSlotNo     String?       @map("official_slot_no")
  isCodeProvisional  Boolean       @default(false) @map("is_code_provisional")
  slotKind           StoreSlotKind @map("slot_kind")
  side               StoreSide     @default(UNKNOWN)
  areaLabel          String        @map("area_label")
  seatSectionHints   Json?         @map("seat_section_hints")
  xPct               Float?        @map("x_pct")
  yPct               Float?        @map("y_pct")
  polygonSvgPath     String?       @map("polygon_svg_path")
  labelXOffset       Float?        @map("label_x_offset")
  labelYOffset       Float?        @map("label_y_offset")
  rotationDeg        Float?        @map("rotation_deg")
  accessNote         String?       @map("access_note")
  landmarkNote       String?       @map("landmark_note")
  walkingDifficulty  String?       @map("walking_difficulty")
  queueAreaNote      String?       @map("queue_area_note")
  sourceRef          String?       @map("source_ref")
  sourceUrl          String?       @map("source_url")
  sourceConfidence   String?       @map("source_confidence")
  verificationStatus String        @default("DRAFT") @map("verification_status")
  isTenantable       Boolean       @default(true) @map("is_tenantable")
  isFoodMapVisible   Boolean       @default(true) @map("is_food_map_visible")
  isActive           Boolean       @default(true) @map("is_active")
  lastVerifiedAt     DateTime?     @map("last_verified_at")
  createdAt          DateTime      @default(now()) @map("created_at")
  updatedAt          DateTime      @updatedAt @map("updated_at")

  stadium     Stadium          @relation(fields: [stadiumCode], references: [code])
  floor       StadiumFloor     @relation(fields: [floorId], references: [id])
  nearestGate StadiumGate?     @relation(fields: [nearestGateId], references: [id])
  assignments StoreAssignment[]
  notices     StoreNotice[]

  @@unique([stadiumCode, slotNo])
  @@index([floorId])
  @@index([nearestGateId])
  @@index([slotKind])
  @@map("store_slots")
}

model TenantStore {
  id                             BigInt          @id @default(autoincrement())
  name                           String
  brandName                      String?         @map("brand_name")
  normalizedName                 String?         @map("normalized_name")
  category                       String
  description                    String?
  tags                           Json?
  defaultPaymentMethods          Json?           @map("default_payment_methods")
  defaultHoursText               String?         @map("default_hours_text")
  defaultReusableContainerPolicy ContainerPolicy @default(UNKNOWN) @map("default_reusable_container_policy")
  defaultPersonalContainerPolicy ContainerPolicy @default(UNKNOWN) @map("default_personal_container_policy")
  officialUrl                    String?         @map("official_url")
  instagramUrl                   String?         @map("instagram_url")
  logoUrl                        String?         @map("logo_url")
  imageUrls                      Json?           @map("image_urls")
  operatorDisplayName            String?         @map("operator_display_name")
  adminOperatorName              String?         @map("admin_operator_name")
  adminContact                   String?         @map("admin_contact")
  publicNote                     String?         @map("public_note")
  adminNote                      String?         @map("admin_note")
  createdAt                      DateTime        @default(now()) @map("created_at")
  updatedAt                      DateTime        @updatedAt @map("updated_at")

  assignments StoreAssignment[]
  menuItems   TenantMenuItem[]
  notices     StoreNotice[]

  @@index([name])
  @@index([brandName])
  @@index([category])
  @@map("tenant_stores")
}

model StoreAssignment {
  id                  BigInt                @id @default(autoincrement())
  slotId              String                @map("slot_id")
  tenantStoreId       BigInt                @map("tenant_store_id")
  seasonYear          Int?                  @map("season_year")
  status              StoreAssignmentStatus @default(ACTIVE)
  startsOn            DateTime?             @map("starts_on") @db.Date
  endsOn              DateTime?             @map("ends_on") @db.Date
  displayNameOverride String?               @map("display_name_override")
  badgeLabel          String?               @map("badge_label")
  publicNote          String?               @map("public_note")
  adminNote           String?               @map("admin_note")
  sourceUrl           String?               @map("source_url")
  sourceRef           String?               @map("source_ref")
  sourceConfidence    String?               @map("source_confidence")
  createdAt           DateTime              @default(now()) @map("created_at")
  updatedAt           DateTime              @updatedAt @map("updated_at")

  slot           StoreSlot            @relation(fields: [slotId], references: [id])
  tenantStore    TenantStore          @relation(fields: [tenantStoreId], references: [id])
  menuOfferings  StoreMenuOffering[]
  operatingRules StoreOperatingRule[]
  notices        StoreNotice[]

  @@index([slotId, status])
  @@index([tenantStoreId])
  @@index([seasonYear])
  @@index([startsOn, endsOn])
  @@map("store_assignments")
}

model TenantMenuItem {
  id                 BigInt   @id @default(autoincrement())
  tenantStoreId      BigInt   @map("tenant_store_id")
  name               String
  description        String?
  category           String?
  imageUrl           String?  @map("image_url")
  basePriceKrw       Int?     @map("base_price_krw")
  basePriceText      String?  @map("base_price_text")
  isSignature        Boolean  @default(false) @map("is_signature")
  isAlcohol          Boolean  @default(false) @map("is_alcohol")
  isAgeRestricted    Boolean  @default(false) @map("is_age_restricted")
  allergenTags       Json?    @map("allergen_tags")
  dietaryTags        Json?    @map("dietary_tags")
  spicyLevel         Int?     @map("spicy_level")
  sourceUrl          String?  @map("source_url")
  sourceRef          String?  @map("source_ref")
  sourceConfidence   String?  @map("source_confidence")
  verificationStatus String   @default("DRAFT") @map("verification_status")
  isActive           Boolean  @default(true) @map("is_active")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  tenantStore TenantStore         @relation(fields: [tenantStoreId], references: [id])
  offerings   StoreMenuOffering[]

  @@index([tenantStoreId])
  @@index([name])
  @@map("tenant_menu_items")
}

model StoreMenuOffering {
  id                        BigInt         @id @default(autoincrement())
  assignmentId              BigInt         @map("assignment_id")
  menuItemId                BigInt         @map("menu_item_id")
  priceKrw                  Int?           @map("price_krw")
  priceText                 String?        @map("price_text")
  saleStatus                MenuSaleStatus @default(ON_SALE) @map("sale_status")
  usesReusableContainer     Boolean?       @map("uses_reusable_container")
  personalContainerAllowed  Boolean?       @map("personal_container_allowed")
  reusableContainerRequired Boolean?       @map("reusable_container_required")
  containerDepositKrw       Int?           @map("container_deposit_krw")
  personalContainerDiscountKrw Int?        @map("personal_container_discount_krw")
  containerType             String?        @map("container_type")
  estimatedPrepMinutes      Int?           @map("estimated_prep_minutes")
  isPopular                 Boolean        @default(false) @map("is_popular")
  dailyStockLimit           Int?           @map("daily_stock_limit")
  remainingStock            Int?           @map("remaining_stock")
  sortOrder                 Int            @default(0) @map("sort_order")
  note                      String?
  sourceUrl                 String?        @map("source_url")
  sourceRef                 String?        @map("source_ref")
  sourceConfidence          String?        @map("source_confidence")
  verificationStatus        String         @default("DRAFT") @map("verification_status")
  createdAt                 DateTime       @default(now()) @map("created_at")
  updatedAt                 DateTime       @updatedAt @map("updated_at")

  assignment StoreAssignment @relation(fields: [assignmentId], references: [id])
  menuItem   TenantMenuItem   @relation(fields: [menuItemId], references: [id])

  @@unique([assignmentId, menuItemId])
  @@index([assignmentId, sortOrder])
  @@index([menuItemId])
  @@index([saleStatus])
  @@map("store_menu_offerings")
}

model StoreOperatingRule {
  id                    BigInt   @id @default(autoincrement())
  assignmentId           BigInt   @map("assignment_id")
  ruleType               String   @map("rule_type")
  dayOfWeek              Int?     @map("day_of_week")
  specialDate            DateTime? @map("special_date") @db.Date
  openTime               String?  @map("open_time")
  closeTime              String?  @map("close_time")
  openMinutesBeforeGame  Int?     @map("open_minutes_before_game")
  closeTiming            String?  @map("close_timing")
  lastOrderTime          String?  @map("last_order_time")
  textOverride           String?  @map("text_override")
  isActive               Boolean  @default(true) @map("is_active")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  assignment StoreAssignment @relation(fields: [assignmentId], references: [id])

  @@index([assignmentId])
  @@index([ruleType])
  @@map("store_operating_rules")
}

model StoreNotice {
  id            BigInt   @id @default(autoincrement())
  tenantStoreId BigInt?  @map("tenant_store_id")
  assignmentId  BigInt?  @map("assignment_id")
  slotId        String?  @map("slot_id")
  title         String
  body          String
  noticeType    String   @default("GENERAL") @map("notice_type")
  startsAt      DateTime? @map("starts_at")
  endsAt        DateTime? @map("ends_at")
  isPinned      Boolean  @default(false) @map("is_pinned")
  isPublic      Boolean  @default(true) @map("is_public")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  tenantStore TenantStore?     @relation(fields: [tenantStoreId], references: [id])
  assignment  StoreAssignment? @relation(fields: [assignmentId], references: [id])
  slot        StoreSlot?       @relation(fields: [slotId], references: [id])

  @@index([tenantStoreId])
  @@index([assignmentId])
  @@index([slotId])
  @@index([noticeType])
  @@map("store_notices")
}
```

추가 migration SQL:

```sql
CREATE UNIQUE INDEX store_assignments_one_active_per_slot_idx
  ON store_assignments (slot_id)
  WHERE status = 'ACTIVE';
```

## API 설계

### `GET /stadiums/:stadiumCode/floors`

인증 불필요. 층 선택 UI와 지도 이미지/좌표 기준 정보를 내려 준다.

Response:

```json
[
  { "code": "1F", "name": "1층", "sortOrder": 10, "mapImageUrl": "/maps/jamsil-1f.png" },
  { "code": "2F", "name": "2층", "sortOrder": 20, "mapImageUrl": "/maps/jamsil-2f.png" },
  { "code": "2.5F", "name": "2.5층", "sortOrder": 25, "mapImageUrl": "/maps/jamsil-2_5f.png" },
  { "code": "3F", "name": "3층", "sortOrder": 30, "mapImageUrl": "/maps/jamsil-3f.png" },
  { "code": "4F", "name": "4층", "sortOrder": 40, "mapImageUrl": null }
]
```

### `GET /stores`

인증 불필요. 현재 프론트의 `MapScreen` mock을 대체하는 읽기 API다.

Query:

| 이름 | 형식 | 필수 | 설명 |
|---|---|---|---|
| `stadiumCode` | string | 선택 | 기본값 `JAMSIL` |
| `floor` | `1F` \| `2F` \| `2.5F` \| `3F` \| `4F` | 선택 | 층 필터 |
| `foodOnly` | boolean | 선택 | 기본값 `true` |
| `gameId` | string | 선택 | 경기일 기준 배정을 선택할 때 사용 |

Response:

```json
{
  "stadium": {
    "code": "JAMSIL",
    "name": "잠실야구장"
  },
  "source": {
    "version": "2026-ref-structure-v1",
    "lastVerifiedAt": "2026-05-22T00:00:00.000Z"
  },
  "floors": [
    { "code": "1F", "name": "1층", "sortOrder": 10 },
    { "code": "2F", "name": "2층", "sortOrder": 20 },
    { "code": "2.5F", "name": "2.5층", "sortOrder": 25 },
    { "code": "3F", "name": "3층", "sortOrder": 30 },
    { "code": "4F", "name": "4층", "sortOrder": 40 }
  ],
  "stores": [
    {
      "slot": {
        "id": "JAMSIL-B20",
        "slotNo": "B20",
        "officialSlotNo": "B20",
        "isCodeProvisional": false,
        "floorCode": "2F",
        "slotKind": "FOOD",
        "nearestGate": { "code": "GATE_2_3", "name": "GATE 2-3" },
        "side": "FIRST_BASE",
        "areaLabel": "2층 1루 내야 복도",
        "map": { "xPct": 72.0, "yPct": 56.0 },
        "landmarkNote": "1루 측 내부 복도"
      },
      "tenant": {
        "id": "12",
        "name": "BBQ",
        "category": "CHICKEN",
        "status": "ACTIVE",
        "hoursText": "경기일 운영, 상세 시간 현장 확인",
        "badgeLabel": "현장 확인",
        "publicNote": null,
        "reusableContainerPolicy": "UNKNOWN",
        "personalContainerPolicy": "UNKNOWN"
      },
      "menus": [
        {
          "offeringId": "1001",
          "menuItemId": "501",
          "name": "대표 치킨 메뉴",
          "category": "MAIN",
          "priceKrw": null,
          "priceText": "현장 확인",
          "isSignature": true,
          "saleStatus": "ON_SALE",
          "usesReusableContainer": null,
          "personalContainerAllowed": null
        }
      ],
      "operatingRules": [
        {
          "ruleType": "GAME_DAY",
          "textOverride": "경기일 운영, 상세 시간 현장 확인"
        }
      ],
      "notices": []
    }
  ]
}
```

### 후속 API

- `GET /stores/:assignmentId`: 상세 메뉴, 영업 규칙, 공지, 비고, 정책 조회
- `GET /store-slots/:slotId`: 특정 고정 슬롯 상세
- `GET /tenant-stores?query=치킨&floor=1F&gate=GATE_1_2`: 입점 가게/메뉴 검색
- `GET /external-restaurants`: 구장 외부 협력 식당 목록. 잠실 내부 매장 지도와 별도 데이터/화면으로 분리
- `GET /stadiums/:stadiumCode/store-slots`: 관리자/검수용 슬롯 조회
- `POST /admin/store-slots`: 4F 임의 슬롯 등 운영자 추가
- `PATCH /admin/store-slots/:id`: 슬롯 좌표, 게이트, 노출 여부, 검증 상태 수정
- `POST /admin/tenant-stores`: 입점 가게 추가
- `PATCH /admin/tenant-stores/:id`: 입점 가게 기본 정책/설명 수정
- `POST /admin/store-assignments`: 슬롯에 입점 가게 배정
- `PATCH /admin/store-assignments/:id`: 운영자 배정/영업시간/비고 수정
- `POST /admin/tenant-stores/:id/menu-items`: 기본 메뉴 추가
- `PATCH /admin/tenant-menu-items/:id`: 기본 메뉴 수정
- `POST /admin/store-assignments/:id/menu-offerings`: 특정 배정의 판매 메뉴 추가
- `PATCH /admin/store-menu-offerings/:id`: 가격, 품절, 다회용기/개인용기 예외, 검증 상태 수정
- `POST /admin/store-assignments/:id/operating-rules`: 영업시간 규칙 추가
- `PATCH /admin/store-operating-rules/:id`: 영업시간 규칙 수정
- `POST /admin/store-notices`: 공지 추가
- `PATCH /admin/store-notices/:id`: 공지 수정

## 관리자 UI

관리자 UI는 MVP부터 포함한다. 이유는 메뉴, 가격, 다회용기 참여 여부, 개인용기 허용 여부, 경기일/비경기일 영업시간이 모두 수동 확인/입력이 필요한 운영 데이터이기 때문이다.

### 권한

- 기존 카카오 로그인 세션을 사용한다.
- 백엔드에 `UserRole` 또는 동등한 관리자 권한 필드를 추가한다.
- 관리자 API는 `JwtAuthGuard + AdminGuard`로 보호한다.
- 초기 운영자는 DB seed 또는 환경변수 allowlist로 지정한다.

권장 Prisma 추가:

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  // existing fields...
  role UserRole @default(USER)
}
```

### 관리자 화면 범위

초기 관리자 화면은 별도 디자인 완성도보다 빠른 데이터 입력과 검수 안정성이 중요하다. 단, 기존 앱 스타일의 2px 테두리, 카드, segmented control은 유지한다.

필수 화면:

- 매장 슬롯 목록: 층, 매장번호, 카테고리, 게이트, 좌표, 검증 상태
- 슬롯 편집: `slotNo`, 임의 코드 여부, 층, 좌표, 근처 게이트, 구역 설명, 노출 여부
- 입점 가게 목록/편집: 이름, 브랜드명, 카테고리, 기본 다회용기/개인용기 정책
- 배정 편집: 슬롯-가게 연결, 운영 상태, 공개 비고
- 기본 메뉴 편집: 입점 가게별 메뉴명, 기본 가격, 대표 메뉴 여부, 알레르기/주류/매운맛 태그
- 판매 메뉴 편집: 배정별 실제 가격, 품절 상태, 다회용기 사용 여부, 개인용기 허용 여부, 메뉴별 비고
- 영업 규칙 편집: 경기일, 비경기일, 특정일, 텍스트 운영시간
- 공지 편집: 임시 휴무, 품절, 이벤트, 메뉴 변경
- 검수 대시보드: `NEEDS_REVIEW`, `DRAFT`, 가격 미입력, 정책 미확인 항목 필터

### 메뉴/정책 입력 방식

- 매장 기본 정책은 `tenant_stores`에 둔다.
- 실제 노출 정책은 `store_assignments`와 `store_menu_offerings`에서 override 가능해야 한다.
- 메뉴별 예외가 있을 수 있으므로 관리자 UI에서는 `매장 기본값 사용`, `가능`, `불가`, `현장 확인`을 선택할 수 있게 한다.
- 가격은 정수 입력과 `현장 확인` 상태를 분리한다. 가격 미확인 상태에서 임의 가격을 넣지 않는다.

## Frontend 구현 방향

### 1단계: mock shape 교체 준비

- `frontend/src/lib/storesApi.ts` 추가
- `MapScreen.tsx`의 `Spot`을 API 응답 기반 타입으로 교체
- API 실패 시 로컬 fixture로 fallback 가능하게 둔다.
- 현재 `Spot.kind`는 `slot.slotKind`와 내부/외부 화면 분기로 대체한다.

### 2단계: 층 필터 추가

현재 화면은 `구장 내부/외부 식당` 탭만 있다. 잠실 내부 구현에서는 층 선택이 핵심이고, 외부 식당은 내부 슬롯 지도와 데이터 성격이 다르므로 분리한다.

- 상단: `1F`, `2F`, `2.5F`, `3F`, `4F` segmented control
- 보조 필터: `전체`, `식사`, `카페`, `편의점`, `맥주/음료`
- 검색: 가게명, 메뉴명, 매장번호, 가까운 게이트
- 후속 필터: 다회용기 가능, 개인용기 가능, 주류, 품절 제외
- 기존 `외부 식당` 탭은 같은 SVG 지도에 섞지 않고 별도 화면/탭으로 분리
- 외부 식당 데이터는 `store_slots`에 넣지 않는다. 주소, 위경도, 도보 시간, 제휴 정책을 갖는 `external_restaurants` 또는 `partner_restaurants` 모델로 후속 설계한다.

### 3단계: 지도 렌더링

- MVP는 기존 SVG 스타일을 유지하되, 아모제 AVIF처럼 단순화된 SVG 레이어를 직접 만든다.
- 층별 배경은 ref 이미지를 그대로 쓰기보다, 현재 스타일에 맞춘 단순화된 SVG 레이어를 만든다.
- `xPct`, `yPct`는 0-100 정규화 좌표로 저장하고, 렌더 시 SVG viewBox에 맞게 변환한다.
- 선택 핀은 현재처럼 외곽 halo + 상세 카드 동기화 유지
- `slotNo`를 핀 라벨로 작게 표시한다. 예: `B20`

권장 레이어 구조:

- `StadiumBaseLayer`: 경기장 필드, U자형 콘코스, 좌석 블록을 회색/크림 톤으로 그림
- `FloorZoneLayer`: 1F의 A/B/C 구역 아크 또는 2F 이상 좌우 콘코스 구역 강조
- `GateLayer`: `GATE 1-1`, `GATE 2-3`, 1루/3루 내야·외야 출입구 라벨
- `FacilityLayer`: 화장실, 수유실, 놀이방 같은 비식음료 시설 아이콘
- `StoreMarkerLayer`: DB의 `store_slots.xPct/yPct` 기준으로 매장 마커와 `slotNo`를 렌더링
- `SelectionLayer`: 선택 매장 halo, 강조 stroke, 상세 카드 동기화

SVG 구현 방식:

- `viewBox="0 0 1000 1000"` 기준으로 통일한다.
- 배경 콘코스는 `path`/`ellipse`/`polygon`으로 손으로 단순화한다.
- 마커 위치는 DB의 `xPct/yPct`를 `x = xPct * 10`, `y = yPct * 10`으로 변환한다.
- 1F는 아모제처럼 `A/B/C` 색상 아크를 보조 레이어로 둘 수 있지만, 실제 노출 라벨은 기존 구조도의 `A01`, `B01` 같은 `slotNo`를 사용한다.
- 2F/2.5F/3F/4F는 같은 U자형 베이스 레이어를 재사용하고, 층별 슬롯 좌표와 색상만 바꾼다.
- Figma는 필요하지 않다. 단, 레이어가 너무 복잡해지면 Figma에서 U자형 콘코스만 임시로 그려 SVG export한 뒤 `StadiumBaseLayer`의 path로 가져온다.

### 4단계: 상세 카드

선택 카드 정보 우선순위:

1. 매장번호 + 가게명
2. 층 + 가까운 게이트 + 구역
3. 영업시간/운영 상태
4. 대표 메뉴 2-4개
5. 다회용기/개인용기 가능 여부
6. 비고

### 5단계: 좌석 기반 추천

MVP 이후:

- 사용자의 `seatInfo.section`을 좌석 블록으로 파싱
- `seatSectionHints`와 `side`, `StadiumFloor.sortOrder`로 가까운 매장 정렬
- 정확한 실내 길찾기는 보류하고, `같은 층/같은 방향/가까운 게이트` 기준 추천부터 구현

## 초기 시드 범위

### 1F

식음료/편의점:

- `A01` 카페희다
- `A02` BHC
- `A03` 잠실원샷 / Mr. Pizza
- `A04` GS25
- `A05` 한식 분식
- `A06` 맘스터치
- `A07` BBQ
- `A09` 도미노피자
- `A10` 광장 식당
- `A11` KFC
- `A12` 꼬꼬닭
- `A13` GS25
- `A16` GS25
- `A17` 수내닭꼬치
- `A19` 명인만두
- `A20` 맘스터치
- `A21` BBQ
- `A22` GS25
- `A26` GS25
- `A28` 코카-콜라 팝업 스토어

랜드마크/비식음료:

- `A14` 제 2 매표소
- `A15` 제 3 매표소
- `A18` 제 1 매표소 / 무인 발권기
- `A23` 트윈스 팀 스토어
- `A25` 무인 발권기
- `A27` 중앙 매표소

### 2F

식음료/편의점:

- `B01` BHC
- `B02` 카페 그라운드
- `B03` 피자헛
- `B04` 송사부 고로케
- `B05` 죠스 떡볶이
- `B06` 통밥
- `B07` 달콤
- `B08` 와팡
- `B11` KFC
- `B12` BBQ
- `B13` GS25
- `B19` GS25
- `B20` BBQ
- `B21` 맘스터치
- `B24` 꼬꼬닭 카페
- `B26` 갑또리 닭강정 / 초량본가어묵
- `B27` Miss&Mr Potato
- `B28` 잠실원샷
- `B29` 신철판
- `B30` 명인만두
- `B31` 백미당
- `B32` 맥주창고
- `B33` 죠스 떡볶이
- `B34` 앤티앤스 프레즐
- `B35` 피자헛
- `B36` BHC
- `B37` 수내닭꼬치
- `B38` Mr. Pizza
- `B39` XOXO 핫도그
- `B40` 이가네 떡볶이
- `B41` 신철판

랜드마크/비식음료:

- `B09` 원정 구단 상품샵
- `B10` 원정 구단 상품샵
- `B14` 원정 구단 상품샵
- `B17` 트윈스 팀 스토어
- `B18` 프로스펙스 어센틱샵
- `B22` 잔망루피 콜라보샵
- `B23` 트윈스 팀스토어
- `B25` 트윈스존

### 2.5F

식음료/편의점:

- `C01` 짝태 패밀리
- `C04` 와팡
- `C05` 통밥

랜드마크/비식음료:

- `C02` 놀이방
- `C03` 수유실

### 3F

식음료/편의점:

- `D01` GS25
- `D02` 스태프 핫도그
- `D03` GS25
- `D04` KFC
- `D05` GS25
- `D06` 와팡
- `D07` BBQ
- `D08` GS25
- `D09` 맘스터치
- `D10` GS25
- `D11` 스태프 핫도그
- `D12` GS25

### 4F

ref 구조도는 4F에 번호가 붙은 슬롯을 제공하지 않는다. 사용자 제공 4F 스크린샷 기준으로 매장 라벨만 확인되므로, MVP에서는 임시 내부 코드를 부여하고 `officialSlotNo = null`, `isCodeProvisional = true`, `sourceConfidence = LOW`, `verificationStatus = NEEDS_REVIEW`로 관리한다.

- `F4_01` 잠실원샷
- `F4_02` 사오마라
- `F4_03` 올떡
- `F4_04` 아키토리히

4F는 첨부 스크린샷으로 대략 좌표를 수동 입력할 수 있지만, 공식 매장번호가 확인되기 전까지 화면에 `F4_01` 같은 번호를 크게 노출하지 않는다. 사용자 화면에서는 `4층 · 임시 위치`처럼 표시하고, 관리자 화면에서만 임시 내부 코드를 명확히 보여 준다. 추후 공식 번호가 확인되면 `officialSlotNo`를 채우고, 필요하면 `slotNo`를 교체하되 기존 `id`를 유지하거나 redirect mapping을 둔다.

## 게이트/구역 산정 규칙

정확한 실내 길찾기보다 사용자에게 이해되는 위치 설명이 우선이다.

- `nearestGateCode`: 구조도에 표시된 가장 가까운 게이트/출입구를 수동 입력
- `side`: 1루/3루/중앙/외야를 구조도 위치로 수동 입력
- `areaLabel`: 화면 표시용 문장으로 별도 입력
- `seatSectionHints`: 좌석 기반 추천용 힌트로 점진 입력

예:

```json
{
  "id": "JAMSIL-B30",
  "slotNo": "B30",
  "floorCode": "2F",
  "nearestGateCode": "GATE_2_3",
  "side": "FIRST_BASE",
  "areaLabel": "2층 1루 측 내부 복도",
  "landmarkNote": "B29 신철판, B31 백미당 인근"
}
```

## 구현 순서

1. `docs/DATA_MODEL.md`에 매장 모델 추가
2. `docs/api-spec.md`에 `GET /stores`와 관리자 API 추가
3. `backend/prisma/schema.prisma`에 매장 모델과 관리자 권한 필드 추가
4. Prisma migration 생성
5. `backend/prisma/seed.ts`에 `JAMSIL` 구장, 층, 게이트, 슬롯, 입점 가게, 배정 seed 추가
6. `backend/src/stores/*` 모듈 추가
7. `backend/src/admin/*` 또는 `stores/admin` 하위에 관리자 API 추가
8. `GET /stores`와 관리자 수정 API 테스트 추가
9. `frontend/src/lib/storesApi.ts` 추가
10. `frontend/src/lib/adminStoresApi.ts` 추가
11. `MapScreen.tsx`를 API 기반으로 전환
12. `frontend/src/app/components/map/StadiumSvgMap.tsx` 같은 지도 전용 컴포넌트 추가
13. 아모제 AVIF 스타일을 참고해 `StadiumBaseLayer`, `GateLayer`, `StoreMarkerLayer`로 SVG 레이어 분리
14. 층 필터와 슬롯번호 핀 표시 추가
15. 관리자 화면에서 ref 이미지 기준 좌표/게이트/메뉴/정책 수동 보정
16. 브라우저에서 사용자 지도와 관리자 입력 화면 모두 모바일 폭 기준 레이아웃 확인

## 검증 기준

Backend:

- `cd backend && npm run test`
- `cd backend && npm run build`
- `GET /stores?stadiumCode=JAMSIL&floor=2F`가 2층 슬롯만 반환
- `foodOnly=true`일 때 상품샵/매표소/수유실은 제외
- `foodOnly=false`일 때 랜드마크도 포함
- 가격 미확인 메뉴가 `null`/`현장 확인`으로 안전하게 내려감
- 가격이 입력된 경우 0 이상 정수만 허용
- `store_menu_offerings`는 반드시 `StoreAssignment`와 `TenantMenuItem`을 모두 참조
- `2.5F`가 문자열 층 코드로 정상 조회/정렬됨
- 같은 슬롯에 `ACTIVE` 배정이 2개 이상 들어가지 않음
- 같은 입점 가게가 여러 슬롯에 동시에 배정될 수 있음
- `A08`, `A24`, `B15`, `B16`처럼 비어 있는 코드가 있으므로 슬롯 코드 연속성을 가정하지 않음
- public API에서 `adminOperatorName`, `adminContact`, `adminNote`가 노출되지 않음
- 관리자 권한이 없는 사용자는 관리자 API에 접근할 수 없음
- 메뉴별 다회용기/개인용기 예외가 매장 기본 정책을 override함

Frontend:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- API 실패 시 fallback 또는 빈 상태가 깨지지 않음
- 층 필터 전환 시 선택 매장이 해당 층 첫 식음료 매장으로 이동
- 긴 매장명(`갑또리 닭강정 / 초량본가어묵`, `앤티앤스 프레즐`)이 카드 밖으로 넘치지 않음
- `slotNo`, 층, 게이트가 상세 카드에 표시됨
- SVG 지도 레이어가 모바일 폭에서 잘리지 않고, 마커와 라벨이 서로 과도하게 겹치지 않음
- 1F/2F/2.5F/3F/4F 모두 같은 `xPct/yPct` 변환 규칙으로 마커가 배치됨
- 관리자 화면에서 `DRAFT`, `NEEDS_REVIEW`, 가격 미확인, 정책 미확인 항목을 필터링할 수 있음
- 4F 임의 슬롯은 사용자 화면에서 공식 번호처럼 보이지 않음

## 결정된 사항

- 다회용기 참여 매장/메뉴는 Zero Seoul 공식 블로그를 우선 출처로 삼고, 부족한 항목은 수동 확인해 입력한다.
- 개인용기 허용 여부는 메뉴별 예외가 있을 수 있으므로 메뉴 단위 override를 지원한다.
- 경기일/비경기일 영업시간은 운영자 입력 데이터로 관리한다.
- 4F는 공식 매장번호를 확인할 수 없으므로 임의 슬롯번호를 부여하되, 사용자 화면에는 공식 번호처럼 노출하지 않는다.
- 외부 식당은 잠실 내부 지도와 분리한다.
- 관리자 UI는 MVP부터 포함한다.
- `Floor`와 `Gate`는 별도 마스터로 둔다.
- 메뉴는 `tenant_menu_items`와 `store_menu_offerings`로 분리한다.
- 영업시간은 `store_operating_rules`, 공지는 `store_notices`로 분리한다.
- 지도 배경은 아모제 AVIF처럼 단순화한 SVG 레이어를 프론트 코드에서 직접 구현한다. Figma export는 필요할 때만 보조로 사용한다.

## 남은 확인 사항

- Zero Seoul 공식 블로그에 있는 참여 매장/메뉴 목록을 현재 ref 구조도의 슬롯번호와 어떻게 매칭할지
- 4F `아키토리히` 등 일부 매장명의 정확한 표기
- 운영자가 확인할 메뉴 가격/다회용기 정책의 검수 책임자와 갱신 주기
- 외부 식당 기능의 별도 출시 시점

## MVP 결론

MVP는 `JAMSIL` 구장 내부 식음료 매장 지도와 관리자 입력 화면을 함께 대상으로 한다. `ref` 구조도에서 확인되는 슬롯과 입점 가게명을 seed로 넣고, 메뉴 가격/다회용기 정책/영업시간은 운영자가 관리자 화면에서 점진적으로 채운다. 데이터 구조는 처음부터 `stadium_floors`, `stadium_gates`, `store_slots`, `tenant_stores`, `store_assignments`, `tenant_menu_items`, `store_menu_offerings`, `store_operating_rules`, `store_notices`로 분리해 두어야 시즌 중 입점 변경, 팝업 스토어, 메뉴 변경을 안전하게 처리할 수 있다.
