import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { DeliveryZonesPage } from './pages/admin/DeliveryZonesPage';
import { CouponsPage } from './pages/admin/CouponsPage';
import { PromotionsPage } from './pages/admin/PromotionsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { CreateCompanyPage } from './pages/admin/CreateCompanyPage';
import { SiteLayout } from './components/site/SiteLayout';
import { CardapioPage } from './pages/site/CardapioPage';
import { ProductPage } from './pages/site/ProductPage';
import { CartPage } from './pages/site/CartPage';
import { CheckoutPage } from './pages/site/CheckoutPage';
import { OrderPage } from './pages/site/OrderPage';
import { OrdersListPage } from './pages/site/OrdersListPage';
import { GroupOrderPage } from './pages/site/GroupOrderPage';
import { LoyaltyPage } from './pages/site/LoyaltyPage';
import { NotificationsPage } from './pages/site/NotificationsPage';
import { KitchenPage } from './pages/staff/KitchenPage';
import { DriverPage } from './pages/staff/DriverPage';

const ADMIN_ROLES = ['ADMIN', 'MANAGER'] as const;
const KITCHEN_ROLES = ['ADMIN', 'MANAGER', 'ATTENDANT', 'KITCHEN'] as const;
const DRIVER_ROLES = ['DRIVER'] as const;

// Toda rota do app vive sob "/:companySlug" — é isso que faz o mesmo
// link/favorito/F5 continuar levando pra empresa certa mesmo depois que
// existir mais de uma empresa na plataforma (ver CompanyContext, que
// resolve a empresa a partir desse mesmo segmento da URL). Os caminhos
// dos elementos abaixo são relativos a esse prefixo — nunca usar path
// absoluto direto num <Link>/<NavLink>/navigate() de página; usar
// useCompanyPath() (cp) pra montar o href com o slug certo.
export function App() {
  return (
    <Routes>
      <Route path="/:companySlug">
        <Route path="login" element={<LoginPage />} />
        <Route path="criar-conta" element={<RegisterPage />} />

        <Route element={<SiteLayout />}>
          <Route path="cardapio" element={<CardapioPage />} />
          <Route path="produto/:id" element={<ProductPage />} />

          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="carrinho" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="pedidos" element={<OrdersListPage />} />
            <Route path="pedido/:id" element={<OrderPage />} />
            <Route path="pedido-em-grupo/:code" element={<GroupOrderPage />} />
            <Route path="fidelidade" element={<LoyaltyPage />} />
            <Route path="notificacoes" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="produtos" element={<ProductsPage />} />
            <Route path="zonas-entrega" element={<DeliveryZonesPage />} />
            <Route path="cupons" element={<CouponsPage />} />
            <Route path="promocoes" element={<PromotionsPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="plataforma/nova-empresa" element={<CreateCompanyPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[...KITCHEN_ROLES]} />}>
          <Route path="cozinha" element={<KitchenPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[...DRIVER_ROLES]} />}>
          <Route path="entregador" element={<DriverPage />} />
        </Route>

        <Route index element={<Navigate to="cardapio" replace />} />
        <Route path="*" element={<Navigate to="cardapio" replace />} />
      </Route>

      {/* Sem slug na URL (raiz do domínio, deploy de preview, etc.) —
          o CompanyContext resolve a empresa e navega pra "/:slug/cardapio"
          assim que souber qual é. Nada renderiza aqui além do loading
          já mostrado pelo <CompanyGate>. */}
      <Route path="*" element={null} />
    </Routes>
  );
}
