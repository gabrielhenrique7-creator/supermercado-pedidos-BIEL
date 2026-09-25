import { defaultProducts, demoCustomers, demoOrders } from "./demo-data";
import type { Customer, Order, Product } from "./types";

const PRODUCTS_KEY = "g-delivery-products";
const ORDERS_KEY = "g-delivery-orders";
const CUSTOMERS_KEY = "g-delivery-customers";
export const LOCAL_STORE_UPDATED = "g-delivery-updated";

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
  getProducts: () => safeRead<Product[]>(PRODUCTS_KEY, defaultProducts),
  saveProducts: (products: Product[]) => save(PRODUCTS_KEY, products),
  getOrders: () => safeRead<Order[]>(ORDERS_KEY, demoOrders).map((order) => {
    const demo = demoOrders.find((item) => item.id === order.id);
    const merged = demo ? { ...demo, ...order, items: order.items?.length ? order.items : demo.items } : order;
    return {
      ...merged,
      paymentStatus: merged.paymentStatus ?? (merged.status === "Entregue" ? "Pago" : merged.payment === "Pix" ? "Aguardando pagamento" : "Pagamento na entrega"),
    };
  }),
  saveOrders: (orders: Order[]) => save(ORDERS_KEY, orders),
  getCustomers: () => safeRead<Customer[]>(CUSTOMERS_KEY, demoCustomers),
  saveCustomers: (customers: Customer[]) => save(CUSTOMERS_KEY, customers),
};
