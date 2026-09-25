export type Category = "Cervejas" | "Destilados" | "Sem álcool" | "Gelo & extras";

export type Product = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  oldPrice?: number;
  category: Category;
  badge?: string;
  emoji: string;
  active: boolean;
  stock: number;
};

export type CartItem = Product & { quantity: number };

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  emoji?: string;
};

export type OrderStatus = "Novo" | "Confirmado" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado";
export type PaymentStatus = "Aguardando pagamento" | "Pago" | "Pagamento na entrega" | "Cancelado";

export type Order = {
  id: string;
  databaseId?: string;
  trackingToken?: string;
  customerId?: string;
  customer: string;
  phone: string;
  address: string;
  payment: string;
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
  createdAt: string;
  status: OrderStatus;
  items?: OrderItem[];
  etaMinutes?: number;
  deliveryNote?: string;
  customerNote?: string;
  updatedAt?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};
