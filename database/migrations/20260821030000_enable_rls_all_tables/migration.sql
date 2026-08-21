-- Endurecimento de segurança (achado da revisão geral): até aqui, só
-- "site_content" tinha Row Level Security habilitado — todas as outras
-- tabelas ficavam sem nenhuma política, o que significa que, se a chave
-- anônima do Supabase algum dia vazasse ou passasse a ser usada em algum
-- client-side, a API REST automática do Supabase (PostgREST) deixaria
-- ler/escrever essas tabelas livremente por fora do backend.
--
-- Habilitar RLS SEM criar nenhuma política = negar tudo por padrão pros
-- papéis "anon"/"authenticated" do PostgREST. Isso não afeta o backend:
-- o Prisma conecta como o papel dono das tabelas (postgres), que ignora
-- RLS por padrão (só "FORCE ROW LEVEL SECURITY", que não estamos usando,
-- afetaria o dono também). Ou seja: zero mudança de comportamento pra
-- aplicação, só fecha um caminho de acesso que nunca deveria existir.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_option_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cart_item_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_item_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_order_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_splits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_zones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupon_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupon_usages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
