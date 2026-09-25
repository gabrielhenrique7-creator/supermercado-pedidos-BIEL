import type { Customer, Order, Product } from "./types";

export const defaultProducts: Product[] = [
  { id: "pilsen-350", name: "Pilsen 350ml", description: "Trincando, do jeito certo.", price: 4.99, oldPrice: 5.79, category: "Cervejas", badge: "Oferta", emoji: "🍺", active: true, stock: 48 },
  { id: "lager-pack", name: "Pack Lager 12 un.", description: "O pack que salva a resenha.", price: 49.9, oldPrice: 57.9, category: "Cervejas", badge: "Mais pedido", emoji: "📦", active: true, stock: 18 },
  { id: "premium-330", name: "Long neck premium", description: "330ml • puro malte.", price: 8.49, category: "Cervejas", emoji: "🍻", active: true, stock: 32 },
  { id: "whisky-1l", name: "Whisky 1L", description: "Para brindar sem pressa.", price: 89.9, category: "Destilados", badge: "Destaque", emoji: "🥃", active: true, stock: 9 },
  { id: "vodka-900", name: "Vodka 900ml", description: "A base da mistura perfeita.", price: 24.9, category: "Destilados", emoji: "🍸", active: true, stock: 14 },
  { id: "refri-2l", name: "Refrigerante 2L", description: "Escolha o sabor no pedido.", price: 10.99, category: "Sem álcool", emoji: "🥤", active: true, stock: 25 },
  { id: "agua-15", name: "Água mineral 1,5L", description: "Gelada ou natural.", price: 4.5, category: "Sem álcool", emoji: "💧", active: true, stock: 40 },
  { id: "gelo-5", name: "Gelo 5kg", description: "Porque bebida quente não dá.", price: 12, category: "Gelo & extras", badge: "Essencial", emoji: "🧊", active: true, stock: 20 },
];

const daysAgo = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const demoOrders: Order[] = [
  { id: "GD-1048", customer: "Marcos", phone: "(99) 99999-1048", address: "Rua do Comércio, 18 — Centro", payment: "Pix", paymentStatus: "Aguardando pagamento", total: 86.4, itemCount: 5, createdAt: daysAgo(0, 19), status: "Novo", etaMinutes: 35, deliveryNote: "Aguardando confirmação da loja", customerNote: "Entregar no portão preto.", items: [{ productId: "pilsen-350", name: "Pilsen 350ml", quantity: 4, unitPrice: 4.99, emoji: "🍺" }, { productId: "demo-combo", name: "Combo da casa", quantity: 1, unitPrice: 66.44, emoji: "📦" }] },
  { id: "GD-1047", customer: "Ana", phone: "(99) 99999-1047", address: "Rua São José, 42 — Vila Nova", payment: "Cartão na entrega", paymentStatus: "Pagamento na entrega", total: 54.9, itemCount: 3, createdAt: daysAgo(0, 16), status: "Em preparo", etaMinutes: 22, deliveryNote: "Pedido confirmado e em separação.", items: [{ productId: "demo-ana", name: "Cerveja premium", quantity: 3, unitPrice: 18.3, emoji: "🍻" }] },
  { id: "GD-1046", customer: "Rafael", phone: "(99) 99999-1046", address: "Av. Principal, 101 — Centro", payment: "Dinheiro", paymentStatus: "Pagamento na entrega", total: 121.7, itemCount: 7, createdAt: daysAgo(1, 20), status: "Saiu para entrega", etaMinutes: 12, deliveryNote: "Entregador a caminho.", customerNote: "Levar troco para R$ 150.", items: [{ productId: "demo-pack", name: "Pack gelado", quantity: 5, unitPrice: 19.9, emoji: "📦" }, { productId: "demo-gelo", name: "Gelo", quantity: 2, unitPrice: 11.1, emoji: "🧊" }] },
  { id: "GD-1045", customer: "Lívia", phone: "(99) 99999-1045", address: "Rua do Aeroporto, 7", payment: "Pix", paymentStatus: "Pago", total: 38.9, itemCount: 2, createdAt: daysAgo(2, 18), status: "Entregue", items: [{ productId: "vodka-900", name: "Vodka 900ml", quantity: 1, unitPrice: 24.9, emoji: "🍸" }, { productId: "demo-extra", name: "Energético", quantity: 1, unitPrice: 14, emoji: "⚡" }] },
  { id: "GD-1044", customer: "João", phone: "(99) 99999-1044", address: "Praça Central, 25 — Centro", payment: "Pix", paymentStatus: "Pago", total: 74.5, itemCount: 4, createdAt: daysAgo(3, 21), status: "Entregue", items: [{ productId: "vodka-900", name: "Vodka 900ml", quantity: 2, unitPrice: 24.9, emoji: "🍸" }, { productId: "demo-refri", name: "Refrigerante 2L", quantity: 2, unitPrice: 12.35, emoji: "🥤" }] },
  { id: "GD-1043", customer: "Bia", phone: "(99) 99999-1043", address: "Rua das Flores, 60 — Vila Nova", payment: "Cartão na entrega", paymentStatus: "Pago", total: 97.8, itemCount: 6, createdAt: daysAgo(5, 17), status: "Entregue", items: [{ productId: "demo-bia", name: "Long neck", quantity: 6, unitPrice: 16.3, emoji: "🍺" }] },
];

export const demoCustomers: Customer[] = demoOrders.map((order) => ({
  id: `cliente-${order.id.toLowerCase()}`,
  name: order.customer,
  phone: order.phone,
  address: order.address,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt ?? order.createdAt,
}));
