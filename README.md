# Lanchonete Delivery

Plataforma completa de delivery para lanchonetes — Web + PWA/App, painel
administrativo, cozinha, entregador, pedido em grupo com divisão de
pagamento, fidelidade, cupons e muito mais.

> Este projeto está sendo construído por etapas. Este README reflete o
> estado atual: **todas as 15 etapas do plano original concluídas** —
> arquitetura, banco de dados, autenticação, cardápio, painel
> administrativo, carrinho, checkout, painel da cozinha, pedido em grupo
> com divisão de pagamento, pagamentos (PIX), zonas de entrega + painel
> do entregador, e cupons/promoções + fidelidade + notificações +
> relatórios. A seção **"O que fica para depois"** no fim deste README
> lista o que ainda é preciso para produção de verdade (gateway de
> pagamento real, canais de notificação externos, etc.) — nenhum desses
> pontos foi prometido como concluído, todos já estavam sinalizados como
> simulação/estrutura preparada em cada etapa.

## 1. Arquitetura

```
Frontend (React + Vite + TS, PWA)  ───HTTP/REST───▶  Backend (NestJS)
                                                          │
                                                          ├──▶ Postgres (Supabase)  — dados de negócio (Prisma)
                                                          └──▶ Supabase Auth/Storage — login, senha, fotos
```

Decisão de arquitetura (confirmada com o time):

- **Frontend e Backend separados.** O frontend (React/Vite) é uma SPA/PWA
  independente que só conversa com a API do backend. O backend (NestJS) é
  a única porta de entrada — inclusive para login/registro.
- **Supabase como infraestrutura, não como API pública.** O Supabase
  fornece o Postgres gerenciado, o motor de autenticação (GoTrue) e
  storage de arquivos. O frontend **nunca** chama o Supabase diretamente:
  o backend usa a `service_role key` (chave de admin) para criar/validar
  usuários e repassa tokens para o frontend. Isso mantém uma única
  superfície de API e permite trocar o Supabase por outro provedor no
  futuro sem reescrever o frontend.
- **Prisma como ORM.** O schema (`/database/schema.prisma`) é a fonte
  única de verdade do modelo de dados; as migrations são geradas pelo
  Prisma e aplicadas ao Postgres do Supabase (local ou cloud).

### Por que essa combinação funciona bem aqui

- Autenticação (login, recuperação de senha, roles) pronta e testada, sem
  reescrever hashing de senha, tokens, etc.
- Realtime do Supabase fica disponível para o painel da cozinha e
  acompanhamento de pedido (usado nas próximas etapas), mesmo com o
  backend separado.
- Storage do Supabase resolve upload de fotos de produtos/logo sem
  precisar de um serviço de arquivos próprio.

## 2. Estrutura de pastas

```
/database
  schema.prisma        → modelo de dados (fonte única de verdade)
  migrations/          → gerado pelo Prisma (histórico de alterações do banco)

/backend               → API NestJS
  prisma/seed.ts        → dados iniciais (admin, categorias, configurações)
  src/
    main.ts             → bootstrap da aplicação (CORS, helmet, validação global)
    app.module.ts        → módulo raiz
    config/              → validação de variáveis de ambiente
    prisma/               → serviço de acesso ao banco (Prisma)
    supabase/             → serviço de integração com Supabase Auth
    common/filters/       → tratamento global de erros
    common/pix/           → gerador de payload PIX (BR Code/EMVCo)
    common/money/         → divisão de valores sem perder centavo
    common/product-options/ → validação de adicionais (compartilhada carrinho/grupo)
    modules/
      auth/, users/, categories/, products/, cart/, addresses/,
      orders/, group-orders/, payments/, delivery-zones/,
      deliveries/, coupons/, notifications/, loyalty/,
      promotions/, reports/   → um módulo por domínio de negócio

/frontend               → React + Vite + TS + PWA
  src/
    lib/api.ts            → cliente HTTP (axios) com refresh automático de token
    contexts/AuthContext.tsx → sessão do usuário logado
    hooks/useCart.ts        → dados e mutations do carrinho (react-query)
    components/admin/      → layout do painel (sidebar + topo)
    components/site/       → layout público (navbar + carrinho)
    pages/admin/            → Dashboard, Categorias, Produtos, Zonas de entrega,
                               Cupons, Promoções, Relatórios
    pages/site/             → Cardápio, Produto, Carrinho, Checkout, Pedido(s),
                               Pedido em grupo, Fidelidade, Notificações
    pages/staff/            → Painel da cozinha, Painel do entregador

/supabase               → configuração do Supabase CLI (stack local)
```

## 3. Modelagem do banco de dados

Schema completo em [`database/schema.prisma`](database/schema.prisma),
com ~28 tabelas cobrindo todos os módulos do sistema:

`users`, `customers`, `addresses`, `categories`, `products`,
`product_options` (grupos de opções), `product_option_items`, `carts`,
`cart_items`, `cart_item_options`, `orders`, `order_items`,
`order_item_options`, `order_status_history`, `group_orders`,
`group_order_members`, `payments`, `payment_splits`, `delivery_zones`,
`delivery_drivers`, `deliveries`, `coupons`, `coupon_products`,
`coupon_usages`, `promotions`, `loyalty_points` (ledger de pontos),
`notifications`, `store_settings`, `audit_logs`.

Todas as tabelas usam UUID como chave primária, `created_at`/`updated_at`
automáticos, e `deleted_at` (soft delete) onde faz sentido preservar
histórico (produtos, pedidos, clientes, endereços, categorias).

## 4. Autenticação e usuários (Etapa 6)

Fluxo implementado:

- `POST /api/auth/register` — cria o usuário no Supabase Auth, cria o
  registro local em `users`/`customers` e já retorna os tokens (login
  automático).
- `POST /api/auth/login` — autentica no Supabase Auth e retorna
  `accessToken`/`refreshToken`.
- `POST /api/auth/refresh` — renova a sessão a partir do refresh token.
- `POST /api/auth/forgot-password` — dispara e-mail de recuperação
  (capturado localmente pelo Inbucket, veja abaixo).
- `POST /api/auth/reset-password` — define nova senha a partir do token
  de recuperação.
- `GET /api/auth/me` — retorna o usuário autenticado (rota protegida).
- `GET /api/users/me` — perfil completo (usuário + dados de customer).

Autorização por papel: use `@UseGuards(JwtAuthGuard, RolesGuard)` +
`@Roles(UserRole.ADMIN, ...)` em qualquer controller novo para restringir
por perfil (`CUSTOMER`, `ADMIN`, `ATTENDANT`, `KITCHEN`, `DRIVER`,
`MANAGER`).

## 5. Cardápio (Etapa 8)

Backend em `backend/src/modules/categories` e `backend/src/modules/products`:

- `GET /api/categories` / `GET /api/products?categoryId=` — rotas públicas,
  só itens ativos (cardápio do cliente).
- `GET /api/categories/admin` / `GET /api/products/admin` — inclui
  inativos (uso do painel administrativo). Requer `ADMIN` ou `MANAGER`.
- `POST/PATCH/DELETE` de categorias e produtos — `ADMIN`/`MANAGER`.
  Exclusão é soft delete (`deletedAt`), preservando histórico de pedidos.
- Grupos de opções e itens (adicionais, "ponto da carne", etc.):
  `POST /api/products/:productId/option-groups`,
  `PATCH|DELETE /api/products/option-groups/:groupId`,
  `POST /api/products/option-groups/:groupId/items`,
  `PATCH|DELETE /api/products/option-items/:itemId`.

## 6. Painel administrativo básico (Etapa 7)

Frontend em `/frontend` (React + Vite + TS + PWA), consumindo a API real:

- `/login` — autentica contra `/api/auth/login`, guarda os tokens e
  redireciona para `/admin`.
- `/admin` — layout com sidebar (Dashboard, Categorias, Produtos),
  protegido por papel (`ADMIN`/`MANAGER`) via `ProtectedRoute`.
- `/admin/categorias` e `/admin/produtos` — CRUD completo, com
  ativar/desativar e remover, já ligado à API.
- Refresh de token automático: um 401 dispara `POST /auth/refresh`
  silenciosamente antes de deslogar o usuário.

Testado de ponta a ponta com Playwright: login, navegação entre páginas,
CRUD real e bloqueio de acesso para o papel `CUSTOMER` — sem erros de
console.

## 7. Carrinho e storefront do cliente (Etapa 9)

Backend em `backend/src/modules/cart` — o carrinho é sempre o do cliente
autenticado (`role: CUSTOMER`), um carrinho `OPEN` por vez:

- `GET /api/cart` — carrinho atual com subtotal/desconto/total calculados
  (cria vazio se não existir).
- `POST /api/cart/items` — adiciona produto com adicionais/opções
  selecionadas. Valida grupos obrigatórios e limites min/max de cada
  grupo (`ProductOptionGroup.required/minSelect/maxSelect`) antes de
  aceitar — ex.: não deixa adicionar um X-Bacon sem escolher o ponto da
  carne se esse grupo for obrigatório.
- `PATCH /api/cart/items/:itemId` — altera quantidade, observação ou
  reseleciona opções (revalida as regras do produto).
- `DELETE /api/cart/items/:itemId` — remove item.
- `POST /api/cart/coupon` / `DELETE /api/cart/coupon` — aplica/remove
  cupom, validando data de vigência, valor mínimo do pedido e limite de
  uso (global e por cliente).
- Taxa de entrega ainda não é calculada (fica para o módulo de zonas de
  entrega); por enquanto sempre `0`.

Frontend (storefront do cliente, em `/frontend/src/pages/site`):

- `/cardapio` — público, lista categorias e produtos.
- `/produto/:id` — público, mostra grupos de opções (rádio para seleção
  única, checkbox para múltipla, com indicação de obrigatório/opcional),
  quantidade e observações. Pede login antes de adicionar ao carrinho.
- `/carrinho` — protegido por papel `CUSTOMER`, edição de quantidade,
  remoção, aplicação de cupom e resumo de valores.
- `/criar-conta` — cadastro de cliente (`POST /auth/register`), login
  automático após criar a conta.

Testado de ponta a ponta com Playwright, incluindo cadastro de um cliente
novo, seleção de adicionais obrigatórios e aplicação do cupom
`PRIMEIRACOMPRA` (criado pelo seed) — sem erros de console.

## 8. Checkout e pedidos (Etapa 10)

Backend novo em `backend/src/modules/addresses` e `backend/src/modules/orders`:

- `GET/POST/PATCH/DELETE /api/addresses` — endereços do cliente. O
  primeiro endereço cadastrado vira padrão automaticamente; marcar outro
  como padrão desmarca os demais.
- `POST /api/orders` — transforma o carrinho aberto do cliente em um
  pedido de verdade: recalcula preços a partir do carrinho (nunca confia
  em valor vindo do cliente), congela um snapshot dos adicionais
  escolhidos em `order_item_options` (preço e nome no momento da compra —
  mesmo que o produto mude depois), grava o cupom usado em
  `coupon_usages` (é só agora que o uso do cupom é definitivo, não no
  momento de aplicar no carrinho), cria a primeira linha de
  `order_status_history` (`RECEIVED`) e um `Payment` (`PENDING` — a
  integração real com gateway/PIX é a próxima etapa de pagamentos). Tudo
  dentro de uma transação; ao final, o carrinho vira `CONVERTED`.
- `GET /api/orders` / `GET /api/orders/:id` — histórico e detalhe,
  restritos ao próprio cliente (outro cliente tentando ver o pedido recebe 403).

Frontend (`/frontend/src/pages/site`):

- `/checkout` — escolhe entrega/retirada, seleciona ou cadastra endereço
  inline, escolhe forma de pagamento, revisa o resumo e confirma.
- `/pedido/:id` — confirmação com timeline visual de status.
- `/pedidos` — histórico de pedidos do cliente.

Testado de ponta a ponta com Playwright (cadastro → cardápio → carrinho →
checkout com endereço novo → confirmação → histórico) e via curl
(carrinho vazio bloqueia o checkout, `DELIVERY` sem endereço é rejeitado,
dono do pedido vê, outro cliente não vê) — sem erros de console.

## 9. Painel da cozinha (Etapa 11)

Backend (dentro de `backend/src/modules/orders`, mesmas rotas de sempre,
mas com guarda de papel diferente por método):

- `GET /api/orders/kitchen` — fila de pedidos ativos (tudo que não é
  `DELIVERED`/`CANCELLED`), mais antigo primeiro. Acesso: `ADMIN`,
  `MANAGER`, `ATTENDANT`, `KITCHEN`.
- `PATCH /api/orders/:id/status` — avança (ou cancela) o status do
  pedido. Valida a transição contra uma máquina de estados
  (`RECEIVED → PAYMENT_CONFIRMED/ACCEPTED → PREPARING → READY →
  OUT_FOR_DELIVERY → DELIVERED`, com `CANCELLED` disponível a partir de
  qualquer status não-terminal) — tentar pular etapa (ex.:
  `RECEIVED` direto para `READY`) é rejeitado com 400. Cada transição
  gera uma nova linha em `order_status_history` com quem mudou.

Frontend: `/cozinha` (papéis `ADMIN`/`MANAGER`/`ATTENDANT`/`KITCHEN`,
login redireciona automaticamente para lá se o papel for
`KITCHEN`/`ATTENDANT`). Um card por pedido — cliente, itens com
adicionais e observações em destaque, cronômetro ao vivo desde a criação
do pedido, destaque vermelho para pedidos com mais de 15 minutos, e um
botão de ação que já sabe qual é o próximo passo (ex.: em `READY` vira
"Saiu para entrega" se for delivery ou "Entregue" se for retirada). A
lista atualiza sozinha a cada 5s (`refetchInterval` do react-query) —
sem WebSocket ainda, mas dá pra trocar pelo Supabase Realtime depois
sem mudar a UI.

Testado com a conta de cozinha do seed (`cozinha@lanchonete.local` /
`cozinha123456`): aceitar e avançar um pedido no painel reflete
imediatamente na timeline que o cliente vê em `/pedido/:id`. Testado
também via curl que pular etapa é bloqueado e que só papéis de staff
acessam essas rotas.

## 10. Pedido em grupo + divisão de pagamento (Etapa 12)

O maior módulo do sistema até agora. Backend inteiro em
`backend/src/modules/group-orders` (~10 endpoints), reaproveitando a
validação de adicionais do carrinho via um utilitário compartilhado
(`common/product-options/option-selection.util.ts`, extraído do
`CartService` para não duplicar a regra).

**Modelo mental:** um `GroupOrder` (código de 6 caracteres, tipo
`ABC123`) tem exatamente **um** `Order` compartilhado por todos os
participantes (relação 1:1 — isso exigiu uma migration extra,
`20260820160000_group_order_one_to_one_order`, corrigindo uma relação
que eu tinha modelado errado como 1:N no schema inicial). Cada item que
um participante adiciona vira um `OrderItem` desse pedido único, marcado
com `groupOrderMemberId` — é assim que dá pra saber depois quem pediu o
quê.

**Ciclo de vida** (`GroupOrder.status`): `OPEN` (todo mundo pode entrar
e adicionar itens) → `LOCKED` (o organizador fechou, cobranças geradas,
ninguém edita mais itens) → `CONFIRMED` (todo mundo pagou — só então o
pedido aparece na fila da cozinha) — ou `CANCELLED`.

- `POST /api/group-orders` — cria o grupo (você já entra como `OWNER`),
  escolhendo `paymentMode` (`SINGLE`/`SPLIT_EQUAL`/`SPLIT_BY_CONSUMPTION`/
  `SPLIT_CUSTOM`) e `deliveryFeeSplitMode`.
- `GET /api/group-orders/:code` — estado completo: membros, itens e
  subtotal de cada um, status, cobranças.
- `POST /api/group-orders/:code/join` — entra no grupo (só enquanto `OPEN`).
- `POST/PATCH/DELETE /api/group-orders/:code/items[/:itemId]` — cada
  participante só edita os próprios itens (validado por
  `groupOrderMemberId`, não só por estar logado).
- `POST /api/group-orders/:code/lock` — só o organizador; escolhe
  entrega/retirada e endereço, e **gera as cobranças** (`PaymentSplit`)
  conforme o `paymentMode`. Divisão de centavos pelo método do maior
  resto (`common/money/split.util.ts`) — a soma das partes bate exato
  com o total, sempre.
- `POST /api/group-orders/:code/splits/:splitId/pay` — cada um só marca
  a própria parte como paga (autorrelato — vira integração de gateway de
  verdade na próxima etapa de pagamentos). Quando a última parte é paga,
  o grupo vira `CONFIRMED` **automaticamente**.
- `POST /api/group-orders/:code/release` — só `ADMIN`/`MANAGER`: libera
  para a cozinha mesmo com pagamento pendente (exigência explícita do
  projeto).
- `POST /api/group-orders/:code/cancel` — o organizador cancela
  enquanto não estiver `CONFIRMED`.

A fila da cozinha e o histórico de pedidos do cliente (`orders.service.ts`)
foram ajustados para só mostrar um pedido em grupo depois de `CONFIRMED`
— enquanto está sendo montado, ele é invisível para todo mundo fora do
grupo.

Frontend: `/pedido-em-grupo/:code` — mostra o código, link + **QR code**
gerado no navegador (pacote `qrcode`, sem chamada externa), lista de
participantes com seus itens e subtotal ao vivo (atualiza a cada 4s),
botão "Adicionar itens" que leva pro cardápio em modo grupo
(`/cardapio?grupo=CODE`, a página de produto detecta o parâmetro e posta
em `/group-orders` em vez do carrinho pessoal), formulário de fechamento
para o organizador, e botão "Marcar como pago" por participante.

Testado de ponta a ponta: via curl (autorização — só o dono fecha o
grupo, só o dono da cobrança paga a própria parte, não-membro não
adiciona item; confirmação automática só depois que todos pagam;
liberação manual funciona mesmo com pendência) e com Playwright rodando
**dois contextos de navegador simultâneos** (um pra cada participante)
simulando o fluxo real de convite — sem erros de console.

## 11. Pagamentos — camada de integração com gateway (Etapa 13)

Backend em `backend/src/modules/payments`, desenhado exatamente como o
projeto pediu: nenhuma lógica de gateway misturada com a lógica de
pedido.

- `PixProvider` (`providers/pix-provider.interface.ts`) — a única coisa
  que o resto do sistema conhece. Trocar de provedor de verdade
  (Mercado Pago, PagSeguro...) é implementar essa interface e trocar o
  binding no `PaymentsModule`; nada mais muda.
- `FakePixProvider` — implementação de demonstração. Gera um payload
  **Pix Copia e Cola real**, no formato EMVCo/Bacen (`common/pix/
  pix-brcode.util.ts`, com o CRC16 calculado de verdade) a partir da
  chave PIX cadastrada em `StoreSettings.pixKey` — se for uma chave PIX
  de verdade, o código gerado é válido e escaneável por qualquer app de
  banco. O QR Code é a imagem desse mesmo payload (pacote `qrcode`). O
  que **não** é real é a confirmação — não há banco do outro lado, só a
  simulação/webhook abaixo.
- `POST /api/payments/:id/pix` — gera (ou reaproveita, se ainda não
  expirou) a cobrança PIX de um pagamento do pedido.
- `POST /api/payments/webhook/fake-pix` — endpoint que um gateway de
  verdade chamaria de forma assíncrona ao aprovar o pagamento. Fica
  **fora** do login de usuário (webhooks externos não têm nosso token) e
  valida um segredo compartilhado (`PIX_WEBHOOK_SECRET`) no lugar —
  um gateway real teria seu próprio esquema de assinatura, mas o
  princípio de separação é o mesmo.
- `POST /api/payments/:id/simulate-approval` — **só para desenvolvimento
  local** (bloqueado se `NODE_ENV=production`): aprova o pagamento sem
  precisar de um banco de verdade, pelo mesmo caminho que o webhook usa.
- Confirmar um pagamento cascata para o pedido: `RECEIVED` →
  `PAYMENT_CONFIRMED` automaticamente (`OrdersService.
  confirmPaymentReceived`), idempotente (chamar duas vezes não duplica
  histórico nem erro).

Frontend: `/pedido/:id` gera o QR Code automaticamente quando o pedido é
PIX e ainda não foi pago, mostra o copia-e-cola com botão de copiar e a
validade, faz polling a cada 4s enquanto aguarda, e (só em modo dev)
mostra um botão "Simular pagamento aprovado" para testar sem precisar de
banco de verdade.

Testado de ponta a ponta: o payload PIX gerado foi conferido campo a
campo contra o formato oficial (indicador, chave, valor batendo com o
total do pedido, CRC16), o webhook rejeita segredo errado (401) e aceita
o correto, a simulação é idempotente, e no navegador o pedido muda de
"Pedido recebido" para "Pagamento confirmado" e o QR some assim que
"pago" — sem erros de console.

## 12. Zonas de entrega + entregador (Etapa 14)

Backend em `backend/src/modules/delivery-zones` e `backend/src/modules/deliveries`.

**Taxa de entrega** — `DeliveryZonesService.calculateFee({type, address, subtotal})`,
usado tanto na criação de pedido normal quanto no fechamento de pedido em
grupo (nunca mais fica em `0` fixo). Prioridade: frete grátis por valor
mínimo → bairro → taxa fixa → padrão da loja (`StoreSettings.
deliveryFeeDefault`). Zonas por distância ficam modeladas no schema mas só
entram em ação quando o sistema tiver geocodificação de endereço — hoje
não há coordenadas coletadas no cadastro.

- `GET /api/delivery-zones` (público) / `GET /api/delivery-zones/admin` —
  cardápio de zonas, `POST/PATCH/DELETE` para `ADMIN`/`MANAGER`.
- `POST /api/delivery-zones/quote` — preview do frete para um endereço,
  usado no checkout antes de confirmar.
- O pedido em grupo ganhou a divisão de taxa de verdade: itens continuam
  divididos por consumo (ou igual, conforme `paymentMode`), e a taxa de
  entrega é rateada separadamente conforme `deliveryFeeSplitMode`
  (`EQUAL`, `PROPORTIONAL` — proporcional ao consumo de cada um —, ou
  `PAYER_ONLY` — só quem organizou paga).

**Entregador** — `backend/src/modules/deliveries`:

- `POST /api/delivery-drivers` (`ADMIN`/`MANAGER`) — cadastra um
  entregador (cria a conta no Supabase Auth + `User` role `DRIVER` +
  `DeliveryDriver`, tudo em uma chamada).
- Quando a cozinha marca um pedido de **entrega** como `READY`, uma
  `Delivery` é criada automaticamente com status `AWAITING_DRIVER` —
  pedidos de retirada não passam por isso.
- `GET /api/deliveries/available` / `POST /api/deliveries/:id/accept` —
  fila de corridas disponíveis e aceite (também avança o pedido para
  `OUT_FOR_DELIVERY`); duas tentativas de aceitar a mesma corrida, só a
  primeira vence.
- `POST /api/deliveries/:id/picked-up` / `.../delivered` — só o
  entregador designado; confirmar entrega também fecha o pedido
  (`DELIVERED`).
- `POST /api/deliveries/:id/assign` (`ADMIN`/`MANAGER`) — atribuição
  manual, sem depender de aceite.
- `POST /api/deliveries/:id/rate` (cliente, só depois de entregue) —
  nota de 1 a 5; a média do entregador (`DeliveryDriver.ratingAverage`)
  é recalculada na hora.

Frontend: `/entregador` (papel `DRIVER`) mostra corridas disponíveis e
em andamento lado a lado, com histórico e avaliação recebida.
`/admin/zonas-entrega` gerencia as zonas. O checkout mostra o frete
calculado antes de confirmar; `/pedido/:id` e a tela do pedido em grupo
mostram a taxa cobrada.

Testado de ponta a ponta via curl (frete calculado certo pro bairro
cadastrado, disputa de corrida entre entregadores, cascata de status
pedido↔entrega, divisão de taxa no grupo batendo o total exato) e no
navegador (checkout mostrando a cotação, painel do entregador, admin de
zonas) — sem erros de console.

## 13. Cupons, promoções, fidelidade, notificações e relatórios (Etapa 15)

Último módulo do plano original — cinco áreas que compartilham uma peça
central nova, `NotificationsService` (uma central de notificações
in-app, desenhada com a mesma filosofia de "camada substituível" do
`PaymentsModule`: canais externos de verdade — WhatsApp, e-mail, push —
ainda não estão conectados, mas todo o resto do sistema já fala com essa
central em vez de qualquer canal específico).

**Cupons** (`backend/src/modules/coupons`) — CRUD para `ADMIN`/`MANAGER`.
O cupom em si já funcionava no carrinho desde a etapa 9; isso fechou a
tela de gestão que faltava (`/admin/cupons`).

**Fidelidade** (`backend/src/modules/loyalty`) — 1 ponto por R$1 gasto,
creditado automaticamente quando o pedido é marcado como entregue. O
nível (Bronze/Prata/Ouro/Diamante) é calculado pelos pontos **ganhos na
vida inteira** do cliente, não pelo saldo — resgatar pontos não derruba
o nível. `POST /api/loyalty/redeem` troca pontos por um cupom de valor
fixo de uso único gerado na hora (100 pontos = R$10, cadastrado como
cupom de verdade, aplicável no carrinho normal). Tela do cliente:
`/fidelidade`.

**Notificações** (`backend/src/modules/notifications`) — central in-app;
o cliente vê em `/notificacoes`. Já está conectada em três lugares reais:
toda mudança de status do pedido (`"Seu pedido #12 saiu para entrega"`),
todo crédito de pontos de fidelidade, e as promoções abaixo.

**Promoções automáticas** (`backend/src/modules/promotions`) — CRUD em
`/admin/promocoes`, com um cron de verdade (`@nestjs/schedule`, todo dia
às 9h) para as promoções baseadas em tempo:
- `BIRTHDAY` — notifica clientes que fazem aniversário hoje.
- `INACTIVE_CUSTOMER` — notifica quem não pede há N dias (configurável).
- `MIN_ORDER_VALUE` — não cabe em um cron (é reativa a um evento, não ao
  tempo): checada direto dentro de `OrdersService.create()` assim que um
  pedido é criado.
Cada promoção evita notificar a mesma pessoa duas vezes no período
configurado (checando o histórico de notificações antes de disparar de
novo). Um endpoint `POST /promotions/run-now` deixa testar sem esperar
o cron.

**Relatórios** (`backend/src/modules/reports`) — `GET /reports/sales`
agrega receita, ticket médio, pedidos por status, receita por forma de
pagamento, produtos mais vendidos, vendas por dia, tempo médio de
preparo e de entrega — tudo filtrável por período. `GET /reports/sales/
export` gera CSV. O dashboard do admin (`/admin`, que desde a etapa 7
só tinha "—" nos cartões) agora mostra os números de hoje de verdade, e
`/admin/relatorios` é a versão completa com filtro de data e exportação.

Testado de ponta a ponta: um pedido acima do valor mínimo configurado
gerou a notificação na hora; o ciclo completo de status de um pedido
gerou uma notificação por etapa e creditou os pontos certos ao ser
entregue; resgate bloqueado corretamente por saldo insuficiente;
relatório batendo exatamente com os pedidos de teste criados na sessão;
CSV exportado com dados reais — tudo também visualmente confirmado no
navegador (dashboard, cupons, promoções, relatórios, fidelidade,
notificações), sem erros de console.

## 14. Como rodar localmente

### Pré-requisitos

- Node.js 22+ e npm (você já tem: `node v22.13.0`, `npm 10.9.2`)
- Docker Desktop rodando (você já tem: `docker v29.4.0`)
- Não precisa criar conta nem projeto no Supabase — tudo roda local via
  Docker através da Supabase CLI (`npx supabase`), sem instalação global.

### Passo a passo

```bash
# 1. Na raiz do projeto: sobe Postgres + Auth + Storage locais (Docker)
npx supabase start

# 2. Copie os valores impressos (API URL, anon key, service_role key,
#    JWT secret) — ou rode a qualquer momento:
npx supabase status

# 3. Configure o backend
cd backend
cp .env.example .env
# edite .env com os valores do passo 2 (SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY)

# 4. Instale as dependências
npm install

# 5. Aplique as migrations no banco local (cria as tabelas)
npm run prisma:migrate:dev -- --name init

# 6. Popule dados iniciais (usuário admin, categorias, configurações)
npm run prisma:seed

# 7. Suba a API
npm run start:dev
# API disponível em http://localhost:3001/api

# 8. Em outro terminal, suba o frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
# Painel em http://localhost:5173/login (admin@lanchonete.local / admin123456)
```

### Testando a autenticação

```bash
# Registrar um cliente
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"João Teste","email":"joao@teste.com","password":"12345678"}'

# Login com o admin criado pelo seed
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lanchonete.local","password":"admin123456"}'

# Rota protegida (troque TOKEN pelo accessToken retornado acima)
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer TOKEN"
```

E-mails de recuperação de senha em ambiente local não são enviados de
verdade — abra **http://127.0.0.1:54324** (Inbucket) para visualizá-los.

O painel do Supabase Studio local fica em **http://127.0.0.1:54323**
(útil para inspecionar tabelas e usuários sem precisar de SQL).

### Variáveis de ambiente (`backend/.env`)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Connection string do Postgres (local ou do projeto Supabase cloud) |
| `SUPABASE_URL` | URL da API do Supabase (local: `http://127.0.0.1:54321`) |
| `SUPABASE_ANON_KEY` | Chave pública, usada para login/refresh |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de admin — só o backend deve tê-la |
| `CORS_ORIGIN` | URL do frontend autorizada a chamar a API |
| `PIX_WEBHOOK_SECRET` | Segredo que o webhook de pagamento precisa enviar — troque antes de produção |

> A verificação do token não usa mais um secret fixo: o backend busca as
> chaves públicas do projeto em `SUPABASE_URL/auth/v1/.well-known/jwks.json`
> (Supabase assina os tokens com ES256/chave assimétrica por padrão em
> projetos novos). Isso funciona igual no ambiente local e no cloud, sem
> configuração extra.

### Quando você criar o projeto Supabase na nuvem

Basta trocar os valores de `DATABASE_URL`, `SUPABASE_URL` e as chaves no
`.env` (ou nas variáveis de ambiente do servidor de produção) para os
valores do projeto cloud, e rodar `npm run prisma:migrate:deploy` para
aplicar as migrations lá. Nenhum código muda.

## 15. O que fica para depois

O plano original de 15 etapas está completo. O que resta é o que já
estava sinalizado como simulação/estrutura ao longo do caminho — não são
etapas esquecidas, são as pontas que só fazem sentido fechar com decisões
de negócio reais (qual gateway, qual provedor de WhatsApp, etc.):

- **Gateway de pagamento de verdade.** `FakePixProvider` gera um payload
  PIX real e válido, mas a confirmação é sempre manual (simulação ou
  webhook de teste). Trocar por Mercado Pago/PagSeguro/Stripe é
  implementar `PixProvider` de novo — a arquitetura já isola isso.
- **Canais de notificação externos.** WhatsApp, e-mail e push hoje são
  só a central in-app (`NotificationsService`). Mesma lógica do
  pagamento: um provider a implementar, o resto do sistema não muda.
- **Painel de usuários e configurações da loja.** Dá pra gerenciar
  papéis de `ATTENDANT`/`MANAGER` e trocar nome/logo/cor/horário da loja
  só via banco/API hoje — faltam as telas de admin para isso
  (`store_settings` e papéis de usuário já existem no schema).
- **Zonas de entrega por distância.** O tipo `DISTANCE` existe no schema
  e no `DeliveryZonesService`, mas depende de geocodificar o endereço
  (nenhum endereço tem latitude/longitude hoje).
- **Exportação em Excel/PDF.** Os relatórios exportam CSV; Excel/PDF
  exigiriam uma lib de geração de arquivo, hoje fora de escopo.
- **App mobile nativo / PWA instalável de verdade.** O frontend já é um
  PWA (manifest + service worker via `vite-plugin-pwa`), mas não foi
  testado instalado num aparelho físico.
