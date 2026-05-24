-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StoreSlotKind" AS ENUM (
    'FOOD',
    'CAFE',
    'CONVENIENCE',
    'GOODS',
    'TICKET',
    'INFO',
    'FAMILY',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "StoreSide" AS ENUM (
    'FIRST_BASE',
    'THIRD_BASE',
    'CENTER',
    'OUTFIELD',
    'INFIELD',
    'UNKNOWN'
);

-- CreateEnum
CREATE TYPE "StoreAssignmentStatus" AS ENUM ('ACTIVE', 'PLANNED', 'TEMP_CLOSED', 'ENDED');

-- CreateEnum
CREATE TYPE "ContainerPolicy" AS ENUM (
    'UNKNOWN',
    'SUPPORTED',
    'NOT_SUPPORTED',
    'MENU_DEPENDENT'
);

-- CreateEnum
CREATE TYPE "MenuSaleStatus" AS ENUM ('ON_SALE', 'SOLD_OUT', 'HIDDEN');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "stadiums" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stadiums_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "stadium_floors" (
    "id" TEXT NOT NULL,
    "stadium_code" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "map_image_url" TEXT,
    "map_width" INTEGER,
    "map_height" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "source_ref" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stadium_floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stadium_gates" (
    "id" TEXT NOT NULL,
    "stadium_code" TEXT NOT NULL,
    "floor_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gate_type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "x_pct" DOUBLE PRECISION,
    "y_pct" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stadium_gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_slots" (
    "id" TEXT NOT NULL,
    "stadium_code" TEXT NOT NULL,
    "floor_id" TEXT NOT NULL,
    "nearest_gate_id" TEXT,
    "slot_no" TEXT NOT NULL,
    "official_slot_no" TEXT,
    "is_code_provisional" BOOLEAN NOT NULL DEFAULT false,
    "slot_kind" "StoreSlotKind" NOT NULL,
    "side" "StoreSide" NOT NULL DEFAULT 'UNKNOWN',
    "area_label" TEXT NOT NULL,
    "seat_section_hints" JSONB,
    "x_pct" DOUBLE PRECISION,
    "y_pct" DOUBLE PRECISION,
    "polygon_svg_path" TEXT,
    "label_x_offset" DOUBLE PRECISION,
    "label_y_offset" DOUBLE PRECISION,
    "rotation_deg" DOUBLE PRECISION,
    "access_note" TEXT,
    "landmark_note" TEXT,
    "walking_difficulty" TEXT,
    "queue_area_note" TEXT,
    "source_ref" TEXT,
    "source_url" TEXT,
    "source_confidence" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_tenantable" BOOLEAN NOT NULL DEFAULT true,
    "is_food_map_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_stores" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand_name" TEXT,
    "normalized_name" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB,
    "default_payment_methods" JSONB,
    "default_hours_text" TEXT,
    "default_reusable_container_policy" "ContainerPolicy" NOT NULL DEFAULT 'UNKNOWN',
    "default_personal_container_policy" "ContainerPolicy" NOT NULL DEFAULT 'UNKNOWN',
    "official_url" TEXT,
    "instagram_url" TEXT,
    "logo_url" TEXT,
    "image_urls" JSONB,
    "operator_display_name" TEXT,
    "admin_operator_name" TEXT,
    "admin_contact" TEXT,
    "public_note" TEXT,
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_assignments" (
    "id" BIGSERIAL NOT NULL,
    "slot_id" TEXT NOT NULL,
    "tenant_store_id" BIGINT NOT NULL,
    "season_year" INTEGER,
    "status" "StoreAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_on" DATE,
    "ends_on" DATE,
    "display_name_override" TEXT,
    "badge_label" TEXT,
    "public_note" TEXT,
    "admin_note" TEXT,
    "source_url" TEXT,
    "source_ref" TEXT,
    "source_confidence" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_menu_items" (
    "id" BIGSERIAL NOT NULL,
    "tenant_store_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "image_url" TEXT,
    "base_price_krw" INTEGER,
    "base_price_text" TEXT,
    "is_signature" BOOLEAN NOT NULL DEFAULT false,
    "is_alcohol" BOOLEAN NOT NULL DEFAULT false,
    "is_age_restricted" BOOLEAN NOT NULL DEFAULT false,
    "allergen_tags" JSONB,
    "dietary_tags" JSONB,
    "spicy_level" INTEGER,
    "source_url" TEXT,
    "source_ref" TEXT,
    "source_confidence" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_menu_offerings" (
    "id" BIGSERIAL NOT NULL,
    "assignment_id" BIGINT NOT NULL,
    "menu_item_id" BIGINT NOT NULL,
    "price_krw" INTEGER,
    "price_text" TEXT,
    "sale_status" "MenuSaleStatus" NOT NULL DEFAULT 'ON_SALE',
    "uses_reusable_container" BOOLEAN,
    "personal_container_allowed" BOOLEAN,
    "reusable_container_required" BOOLEAN,
    "container_deposit_krw" INTEGER,
    "personal_container_discount_krw" INTEGER,
    "container_type" TEXT,
    "estimated_prep_minutes" INTEGER,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "daily_stock_limit" INTEGER,
    "remaining_stock" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "source_url" TEXT,
    "source_ref" TEXT,
    "source_confidence" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_menu_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_operating_rules" (
    "id" BIGSERIAL NOT NULL,
    "assignment_id" BIGINT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "special_date" DATE,
    "open_time" TEXT,
    "close_time" TEXT,
    "open_minutes_before_game" INTEGER,
    "close_timing" TEXT,
    "last_order_time" TEXT,
    "text_override" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_operating_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_notices" (
    "id" BIGSERIAL NOT NULL,
    "tenant_store_id" BIGINT,
    "assignment_id" BIGINT,
    "slot_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "notice_type" TEXT NOT NULL DEFAULT 'GENERAL',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stadium_floors_stadium_code_code_key" ON "stadium_floors"("stadium_code", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stadium_gates_stadium_code_code_key" ON "stadium_gates"("stadium_code", "code");

-- CreateIndex
CREATE INDEX "stadium_gates_floor_id_idx" ON "stadium_gates"("floor_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_slots_stadium_code_slot_no_key" ON "store_slots"("stadium_code", "slot_no");

-- CreateIndex
CREATE INDEX "store_slots_floor_id_idx" ON "store_slots"("floor_id");

-- CreateIndex
CREATE INDEX "store_slots_nearest_gate_id_idx" ON "store_slots"("nearest_gate_id");

-- CreateIndex
CREATE INDEX "store_slots_slot_kind_idx" ON "store_slots"("slot_kind");

-- CreateIndex
CREATE INDEX "tenant_stores_name_idx" ON "tenant_stores"("name");

-- CreateIndex
CREATE INDEX "tenant_stores_brand_name_idx" ON "tenant_stores"("brand_name");

-- CreateIndex
CREATE INDEX "tenant_stores_category_idx" ON "tenant_stores"("category");

-- CreateIndex
CREATE INDEX "store_assignments_slot_id_status_idx" ON "store_assignments"("slot_id", "status");

-- CreateIndex
CREATE INDEX "store_assignments_tenant_store_id_idx" ON "store_assignments"("tenant_store_id");

-- CreateIndex
CREATE INDEX "store_assignments_season_year_idx" ON "store_assignments"("season_year");

-- CreateIndex
CREATE INDEX "store_assignments_starts_on_ends_on_idx" ON "store_assignments"("starts_on", "ends_on");

-- CreateIndex
CREATE UNIQUE INDEX "store_assignments_one_active_per_slot_idx"
ON "store_assignments"("slot_id")
WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "tenant_menu_items_tenant_store_id_idx" ON "tenant_menu_items"("tenant_store_id");

-- CreateIndex
CREATE INDEX "tenant_menu_items_name_idx" ON "tenant_menu_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "store_menu_offerings_assignment_id_menu_item_id_key" ON "store_menu_offerings"("assignment_id", "menu_item_id");

-- CreateIndex
CREATE INDEX "store_menu_offerings_assignment_id_sort_order_idx" ON "store_menu_offerings"("assignment_id", "sort_order");

-- CreateIndex
CREATE INDEX "store_menu_offerings_menu_item_id_idx" ON "store_menu_offerings"("menu_item_id");

-- CreateIndex
CREATE INDEX "store_menu_offerings_sale_status_idx" ON "store_menu_offerings"("sale_status");

-- CreateIndex
CREATE INDEX "store_operating_rules_assignment_id_idx" ON "store_operating_rules"("assignment_id");

-- CreateIndex
CREATE INDEX "store_operating_rules_rule_type_idx" ON "store_operating_rules"("rule_type");

-- CreateIndex
CREATE INDEX "store_notices_tenant_store_id_idx" ON "store_notices"("tenant_store_id");

-- CreateIndex
CREATE INDEX "store_notices_assignment_id_idx" ON "store_notices"("assignment_id");

-- CreateIndex
CREATE INDEX "store_notices_slot_id_idx" ON "store_notices"("slot_id");

-- CreateIndex
CREATE INDEX "store_notices_notice_type_idx" ON "store_notices"("notice_type");

-- AddForeignKey
ALTER TABLE "stadium_floors"
ADD CONSTRAINT "stadium_floors_stadium_code_fkey"
FOREIGN KEY ("stadium_code") REFERENCES "stadiums"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stadium_gates"
ADD CONSTRAINT "stadium_gates_stadium_code_fkey"
FOREIGN KEY ("stadium_code") REFERENCES "stadiums"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stadium_gates"
ADD CONSTRAINT "stadium_gates_floor_id_fkey"
FOREIGN KEY ("floor_id") REFERENCES "stadium_floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_slots"
ADD CONSTRAINT "store_slots_stadium_code_fkey"
FOREIGN KEY ("stadium_code") REFERENCES "stadiums"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_slots"
ADD CONSTRAINT "store_slots_floor_id_fkey"
FOREIGN KEY ("floor_id") REFERENCES "stadium_floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_slots"
ADD CONSTRAINT "store_slots_nearest_gate_id_fkey"
FOREIGN KEY ("nearest_gate_id") REFERENCES "stadium_gates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_assignments"
ADD CONSTRAINT "store_assignments_slot_id_fkey"
FOREIGN KEY ("slot_id") REFERENCES "store_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_assignments"
ADD CONSTRAINT "store_assignments_tenant_store_id_fkey"
FOREIGN KEY ("tenant_store_id") REFERENCES "tenant_stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_menu_items"
ADD CONSTRAINT "tenant_menu_items_tenant_store_id_fkey"
FOREIGN KEY ("tenant_store_id") REFERENCES "tenant_stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_menu_offerings"
ADD CONSTRAINT "store_menu_offerings_assignment_id_fkey"
FOREIGN KEY ("assignment_id") REFERENCES "store_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_menu_offerings"
ADD CONSTRAINT "store_menu_offerings_menu_item_id_fkey"
FOREIGN KEY ("menu_item_id") REFERENCES "tenant_menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_operating_rules"
ADD CONSTRAINT "store_operating_rules_assignment_id_fkey"
FOREIGN KEY ("assignment_id") REFERENCES "store_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_notices"
ADD CONSTRAINT "store_notices_tenant_store_id_fkey"
FOREIGN KEY ("tenant_store_id") REFERENCES "tenant_stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_notices"
ADD CONSTRAINT "store_notices_assignment_id_fkey"
FOREIGN KEY ("assignment_id") REFERENCES "store_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_notices"
ADD CONSTRAINT "store_notices_slot_id_fkey"
FOREIGN KEY ("slot_id") REFERENCES "store_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
