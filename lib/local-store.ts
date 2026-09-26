import type { Customer, Order, Product } from "./types";

const PRODUCTS_KEY = "g-delivery-products";
const ORDERS_KEY = "g-delivery-orders";
const CUSTOMERS_KEY = "g-delivery-customers";
export const LOCAL_STORE_UPDATED = "g-delivery-updated";
const LEGACY_DEMO_ORDER_IDS = new Set(["GD-1043", "GD-1044", "GD-1045", "GD-1046", "GD-1047", "GD-1048"]);
const LEGACY_DEMO_CUSTOMER_IDS = new Set(["cliente-gd-1043", "cliente-gd-1044", "cliente-gd-1045", "cliente-gd-1046", "cliente-gd-1047", "cliente-gd-1048"]);

function save<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(LOCAL_STORE_UPDATED, { detail: key }));
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const localStore = {
  getProducts: () => safeRead<Product[]>(PRODUCTS_KEY, []),
  saveProducts: (products: Product[]) => save(PRODUCTS_KEY, products),
  getOrders: () => safeRead<Order[]>(ORDERS_KEY, []).filter((order) => !LEGACY_DEMO_ORDER_IDS.has(order.id)).map((order) => ({
    ...order,
    paymentStatus: order.paymentStatus ?? (order.status === "Entregue" ? "Pago" : order.payment === "Pix" ? "Aguardando pagamento" : "Pagamento na entrega"),
  })),
  saveOrders: (orders: Order[]) => save(ORDERS_KEY, orders),
  getCustomers: () => safeRead<Customer[]>(CUSTOMERS_KEY, []).filter((customer) => !LEGACY_DEMO_CUSTOMER_IDS.has(customer.id)),
  saveCustomers: (customers: Customer[]) => save(CUSTOMERS_KEY, customers),
};
