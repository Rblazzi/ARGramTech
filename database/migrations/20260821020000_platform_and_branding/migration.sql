-- Banner por empresa (branding, editável pelo próprio dono da empresa em
-- /admin/configuracoes) + conteúdo editável do site institucional (CMS
-- simples, editado pelo dono da plataforma em /plataforma/site).

ALTER TABLE "companies" ADD COLUMN "banner_url" TEXT;

CREATE TABLE "site_content" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hero_eyebrow" TEXT NOT NULL DEFAULT 'Plataforma de tecnologia para empresas',
    "hero_text" TEXT NOT NULL DEFAULT 'Tenha sistemas completos, modernos e fáceis de usar para simplificar a gestão da sua empresa.',
    "hero_cta_primary_label" TEXT NOT NULL DEFAULT 'Conheça nossos produtos',
    "hero_cta_secondary_label" TEXT NOT NULL DEFAULT 'Solicitar demonstração',
    "footer_tagline" TEXT NOT NULL DEFAULT 'Tecnologia inteligente para transformar o seu negócio.',
    "logo_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- Semeia a única linha com os valores atuais do HTML estático, pra
-- GET /platform/site-content nunca vir vazio.
INSERT INTO "site_content" ("id") VALUES (gen_random_uuid());

-- RLS: o conteúdo é público mesmo (servido sem login pelo site
-- institucional), então libera leitura geral — mas nenhuma política de
-- escrita, então a API REST do Supabase (anon/authenticated key) não
-- consegue alterar essa linha por fora. O Prisma continua escrevendo
-- normalmente: conecta como o papel dono da tabela, que ignora RLS.
ALTER TABLE "site_content" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content_public_read" ON "site_content"
    FOR SELECT
    USING (true);
