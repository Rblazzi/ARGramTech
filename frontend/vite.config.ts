import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// O service worker do PWA (vite-plugin-pwa) foi removido: ele fica
// registrado no domínio da EMPRESA (ex.: www.argramtech.com.br), mas
// esse domínio agora serve o site institucional na raiz e só chega ao
// app via proxy (institutional-site/vercel.json) — a combinação
// causava falha na navegação entre páginas (o SW interceptava
// requests com um cache incompatível com o proxy). Também nunca dava
// pra ter nome/ícone dinâmico por empresa no manifest (é gerado em
// build time), então não valia a complexidade de contornar o bug.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
})
