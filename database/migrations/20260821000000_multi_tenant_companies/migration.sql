-- Migração pra multi-tenant: introduz Company/CompanyMembership e escopa
-- por empresa as tabelas de negócio. Escrita à mão (não só o diff
-- automático do Prisma) porque precisa fazer backfill de dados reais que
-- já existem em produção (usuários de teste + pedidos/carrinho/produto
-- criados durante os testes manuais pela interface).
--
-- Truque central: ao criar a company_membership de cada usuário
-- existente, reusamos o próprio user.id como id da membership. Como
-- customers.id e delivery_drivers.id já valem o user.id (relação 1:1
-- antiga), isso faz a nova FK (customers.id -> company_memberships.id)
-- validar de cara, sem precisar remapear nenhuma linha de
-- addresses/carts/orders/group_orders que já referencia esses ids.

-- ==================================================================
-- 1) Solta as FKs antigas de customers/delivery_drivers (apontavam pra
--    users) e os unique constraints globais que vão virar por-empresa.
-- ==================================================================
ALTER TABLE "customers" DROP CONSTRAINT "customers_id_fkey";
ALTER TABLE "delivery_drivers" DROP CONSTRAINT "delivery_drivers_id_fkey";

DROP INDEX "categories_slug_key";
DROP INDEX "products_internal_code_key";
DROP INDEX "orders_order_number_key";
DROP INDEX "group_orders_code_key";
DROP INDEX "coupons_code_key";

-- orders.order_number deixa de ser autoincrement global — passa a ser
-- calculado por empresa na aplicação (Estágio 2, via lock em
-- companies.last_order_number).
ALTER TABLE "orders" ALTER COLUMN "order_number" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "orders_order_number_seq";

-- ==================================================================
-- 2) Tabela de empresas, semeada a partir da linha única de
--    store_settings que já existia (ou um default, se não existir).
-- ==================================================================
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "custom_domain" TEXT,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#FF7A00',
    "secondary_color" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address_text" TEXT,
    "opening_hours" JSONB,
    "delivery_fee_default" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "min_order_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "avg_prep_time_minutes" INTEGER,
    "pix_key" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'OPEN',
    "social_links" JSONB,
    "auto_messages" JSONB,
    "last_order_number" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

INSERT INTO "companies" (
    "slug", "custom_domain", "name", "logo_url", "primary_color", "phone",
    "whatsapp", "address_text", "opening_hours", "delivery_fee_default",
    "min_order_value", "avg_prep_time_minutes", "pix_key", "status",
    "social_links", "auto_messages"
)
SELECT
    'lanchonete-delivery', 'argramtech.com.br', "name", "logo_url",
    "primary_color", "phone", "whatsapp", "address_text", "opening_hours",
    "delivery_fee_default", "min_order_value", "avg_prep_time_minutes",
    "pix_key", "status", "social_links", "auto_messages"
FROM "store_settings"
LIMIT 1;

-- Fallback caso store_settings estivesse vazia por algum motivo.
INSERT INTO "companies" ("slug", "custom_domain", "name")
SELECT 'lanchonete-delivery', 'argramtech.com.br', 'Lanchonete Delivery'
WHERE NOT EXISTS (SELECT 1 FROM "companies");

-- ==================================================================
-- 3) Vínculo pessoa x empresa (papel por empresa). Backfill: cada
--    usuário existente ganha uma membership na empresa padrão, com o
--    role que ele já tinha em users.role — coletado ANTES de dropar
--    essa coluna. O id da membership reusa o próprio user.id (ver nota
--    no topo do arquivo).
-- ==================================================================
CREATE TABLE "company_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

INSERT INTO "company_memberships" ("id", "user_id", "company_id", "role", "active")
SELECT "id", "id", (SELECT "id" FROM "companies" LIMIT 1), "role", "active"
FROM "users";

ALTER TABLE "users" DROP COLUMN "role";

CREATE UNIQUE INDEX "company_memberships_user_id_company_id_key" ON "company_memberships"("user_id", "company_id");

ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Repõe as FKs de customers/delivery_drivers, agora apontando pra
-- company_memberships em vez de users. Como membership.id == user.id
-- (== customer.id/driver.id de antes), valida sem tocar em nenhuma
-- linha — nenhum dado de address/cart/order/group_order é afetado.
ALTER TABLE "customers" ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "company_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_drivers" ADD CONSTRAINT "delivery_drivers_id_fkey" FOREIGN KEY ("id") REFERENCES "company_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================================
-- 4) company_id nas tabelas de negócio: adiciona anulável, faz
--    backfill pra empresa padrão, só então torna obrigatório — algumas
--    dessas tabelas já têm dados reais (categories, products, coupons,
--    orders, group_orders), então não dá pra simplesmente declarar
--    NOT NULL direto.
-- ==================================================================
ALTER TABLE "categories" ADD COLUMN "company_id" UUID;
ALTER TABLE "products" ADD COLUMN "company_id" UUID;
ALTER TABLE "orders" ADD COLUMN "company_id" UUID;
ALTER TABLE "group_orders" ADD COLUMN "company_id" UUID;
ALTER TABLE "delivery_zones" ADD COLUMN "company_id" UUID;
ALTER TABLE "deliveries" ADD COLUMN "company_id" UUID;
ALTER TABLE "coupons" ADD COLUMN "company_id" UUID;
ALTER TABLE "promotions" ADD COLUMN "company_id" UUID;
ALTER TABLE "notifications" ADD COLUMN "company_id" UUID;

UPDATE "categories" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "products" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "orders" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "group_orders" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "delivery_zones" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "deliveries" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "coupons" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "promotions" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);
UPDATE "notifications" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1);

ALTER TABLE "categories" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "group_orders" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "delivery_zones" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "deliveries" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "coupons" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "promotions" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "company_id" SET NOT NULL;

-- Continua a numeração de pedido a partir de onde já estava, por
-- empresa, em vez de reiniciar do zero.
UPDATE "companies" c SET "last_order_number" = COALESCE(
    (SELECT MAX("order_number") FROM "orders" o WHERE o."company_id" = c."id"),
    0
);

ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================================
-- 5) Índices únicos por empresa (substituem os globais soltos no passo 1).
-- ==================================================================
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE UNIQUE INDEX "companies_custom_domain_key" ON "companies"("custom_domain");
CREATE UNIQUE INDEX "categories_company_id_slug_key" ON "categories"("company_id", "slug");
CREATE UNIQUE INDEX "products_company_id_internal_code_key" ON "products"("company_id", "internal_code");
CREATE UNIQUE INDEX "orders_company_id_order_number_key" ON "orders"("company_id", "order_number");
CREATE UNIQUE INDEX "group_orders_company_id_code_key" ON "group_orders"("company_id", "code");
CREATE UNIQUE INDEX "coupons_company_id_code_key" ON "coupons"("company_id", "code");

-- ==================================================================
-- 6) StoreSettings foi absorvida por Company — não é mais necessária.
-- ==================================================================
DROP TABLE "store_settings";
