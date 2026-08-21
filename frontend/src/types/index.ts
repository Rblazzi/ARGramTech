export type UserRole = 'CUSTOMER' | 'ADMIN' | 'ATTENDANT' | 'KITCHEN' | 'DRIVER' | 'MANAGER';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  membershipId: string;
  isPlatformAdmin: boolean;
}

// Dados públicos da empresa (o que dá pra mostrar antes de logar, pra
// montar o tema da página) — ver CompaniesService.resolveCurrent no backend.
export interface Company {
  id: string;
  slug: string;
  customDomain: string | null;
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressText: string | null;
  openingHours: Record<string, unknown> | null;
  deliveryFeeDefault: string;
  minOrderValue: string;
  avgPrepTimeMinutes: number | null;
  status: 'OPEN' | 'CLOSED' | 'PAUSED';
  socialLinks: Record<string, string> | null;
  active: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; name: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  active: boolean;
}

export type OptionSelectionType = 'SINGLE' | 'MULTIPLE';

export interface ProductOptionItem {
  id: string;
  groupId: string;
  name: string;
  priceDelta: string;
  active: boolean;
  position: number;
}

export interface ProductOptionGroup {
  id: string;
  productId: string;
  name: string;
  required: boolean;
  selectionType: OptionSelectionType;
  minSelect: number;
  maxSelect: number;
  position: number;
  items: ProductOptionItem[];
}

export interface Product {
  id: string;
  categoryId: string;
  category: Category;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  active: boolean;
  prepTimeMinutes: number;
  internalCode: string;
  position: number;
  optionGroups: ProductOptionGroup[];
}

export interface CartItemSelectedOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product: { id: string; name: string; imageUrl: string | null; category: string };
  quantity: number;
  notes: string | null;
  unitPrice: number;
  subtotal: number;
  selectedOptions: CartItemSelectedOption[];
}

export interface CartSummary {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  freeShipping: boolean;
  total: number;
  coupon: { code: string; type: string; value: number } | null;
}

export interface Address {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export type OrderType = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'ONLINE';
export type OrderStatus =
  | 'RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItemOption {
  id: string;
  nameSnapshot: string;
  priceDeltaSnapshot: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: { id: string; name: string; imageUrl: string | null };
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes: string | null;
  selectedOptions: OrderItemOption[];
}

export type GroupOrderStatus = 'OPEN' | 'LOCKED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type GroupPaymentMode = 'SINGLE' | 'SPLIT_EQUAL' | 'SPLIT_BY_CONSUMPTION' | 'SPLIT_CUSTOM';
export type SplitStatus = 'AWAITING_PAYMENT' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED' | 'EXPIRED';

export interface GroupMemberItem {
  id: string;
  product: { name: string; imageUrl: string | null };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  selectedOptions: Array<{ id: string; name: string; priceDelta: number }>;
}

export interface GroupMember {
  id: string;
  customerId: string | null;
  name: string;
  role: 'OWNER' | 'MEMBER';
  items: GroupMemberItem[];
  subtotal: number;
  payment: { id: string; amountDue: number; amountPaid: number; status: SplitStatus } | null;
}

export interface GroupOrderView {
  code: string;
  status: GroupOrderStatus;
  paymentMode: GroupPaymentMode;
  deliveryFeeSplitMode: string;
  ownerCustomerId: string;
  order: {
    id: string;
    type: OrderType;
    status: OrderStatus;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  members: GroupMember[];
}

export interface SalesReport {
  period: { from: string; to: string };
  totalRevenue: number;
  orderCount: number;
  cancelledCount: number;
  averageTicket: number;
  ordersByStatus: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  ordersByDay: Array<{ date: string; orders: number; revenue: number }>;
  avgPrepMinutes: number | null;
  avgDeliveryMinutes: number | null;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: string;
  minOrderValue: string | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  _count?: { usages: number };
}

export type PromotionType = 'BIRTHDAY' | 'INACTIVE_CUSTOMER' | 'MIN_ORDER_VALUE';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  ruleConfig: Record<string, number>;
  active: boolean;
  couponId: string | null;
  coupon?: Coupon | null;
}

export interface LoyaltySummary {
  balance: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  lifetimePoints: number;
  pointsPerRealDiscount: number;
  transactions: Array<{ id: string; points: number; type: string; description: string | null; createdAt: string }>;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export type DeliveryZoneType = 'NEIGHBORHOOD' | 'DISTANCE' | 'FIXED' | 'FREE_ABOVE';

export interface DeliveryZone {
  id: string;
  type: DeliveryZoneType;
  name: string;
  fee: string;
  minOrderValueForFree: string | null;
  active: boolean;
}

export type DeliveryStatus = 'AWAITING_DRIVER' | 'DRIVER_ASSIGNED' | 'PICKED_UP' | 'IN_ROUTE' | 'DELIVERED';

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  createdAt: string;
  customerRating: number | null;
  order: {
    id: string;
    orderNumber: number;
    total: string;
    status: OrderStatus;
    address: Address | null;
    customer: { membership: { user: { name: string; phone: string | null } } };
  };
  driver: { membership: { user: { name: string; phone: string | null } } } | null;
}

export interface Order {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  address: Address | null;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    status: string;
    amount: string;
    pixQrCode: string | null;
    pixCopyPaste: string | null;
    expiresAt: string | null;
  }>;
  statusHistory: Array<{ id: string; status: OrderStatus; note: string | null; createdAt: string }>;
  customer?: { membership: { user: { name: string; phone: string | null } } };
}
