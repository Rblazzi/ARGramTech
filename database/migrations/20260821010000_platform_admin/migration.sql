-- Dono/operador da plataforma (não de uma empresa específica) — só quem
-- tem isso pode cadastrar novas empresas via POST /companies.
ALTER TABLE "users" ADD COLUMN     "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;
