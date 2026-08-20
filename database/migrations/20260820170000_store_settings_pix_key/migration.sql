-- Chave PIX da lanchonete, usada para gerar o "copia e cola" das cobranças.
ALTER TABLE "store_settings" ADD COLUMN "pix_key" TEXT;
