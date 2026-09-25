"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Check, Edit3, Eye, EyeOff, LayoutDashboard, LogOut, MessageCircle, Package, Plus, Save, ShoppingBag, Trash2, TrendingUp, Users, X } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { defaultProducts, demoOrders } from "@/lib/demo-data";
import { localStore } from "@/lib/local-store";
import type { Category, Customer, Order, Product } from "@/lib/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const categories: Category[] = ["Cervejas", "Destilados", "Sem álcool", "Gelo & extras"];
type Tab = "overview" | "products" | "orders" | "customers";

function whatsappUrl(phone: string, orderId?: string) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  const message = orderId ? `Olá! Estou entrando em contato sobre o seu pedido ${orderId} na G Delivery.` : "Olá! Aqui é da G Delivery.";
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [saved, setSaved] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProducts(localStore.getProducts());
      setOrders(localStore.getOrders());
      setCustomers(localStore.getCustomers());
    });
    if (configured) {
      const client = createClient();
      client.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: membership } = await client.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
        setAuthenticated(Boolean(membership));
        if (membership) await loadRemoteData();
      });
    }
    return () => window.cancelAnimationFrame(frame);
  }, [configured]);

  async function loadRemoteData() {
    const client = createClient();
    const [{ data: productRows }, { data: orderRows }, { data: customerRows }] = await Promise.all([
      client.from("products").select("id,name,description,image_url,price,old_price,category,badge,emoji,active,stock").order("created_at"),
      client.from("orders").select("id,public_code,tracking_token,customer_id,customer_name,phone,address,payment_method,payment_status,status,total,eta_minutes,delivery_note,customer_note,created_at,updated_at,order_items(product_id,product_name,quantity,unit_price)").order("created_at", { ascending: false }),
      client.from("customers").select("id,name,phone,address,created_at,updated_at").order("updated_at", { ascending: false }),
    ]);
    if (productRows) setProducts(productRows.map((product) => ({ id: product.id, name: product.name, description: product.description, imageUrl: product.image_url ?? undefined, price: Number(product.price), oldPrice: product.old_price === null ? undefined : Number(product.old_price), category: product.category as Category, badge: product.badge ?? undefined, emoji: product.emoji, active: product.active, stock: product.stock })));
    if (orderRows) setOrders(orderRows.map((order) => ({ id: order.public_code, databaseId: order.id, trackingToken: order.tracking_token, customerId: order.customer_id ?? undefined, customer: order.customer_name, phone: order.phone, address: order.address, payment: order.payment_method, paymentStatus: order.payment_status as Order["paymentStatus"], total: Number(order.total), itemCount: order.order_items.reduce((sum, item) => sum + item.quantity, 0), createdAt: order.created_at, updatedAt: order.updated_at, status: order.status as Order["status"], etaMinutes: order.eta_minutes ?? undefined, deliveryNote: order.delivery_note ?? undefined, customerNote: order.customer_note ?? undefined, items: order.order_items.map((item) => ({ productId: item.product_id ?? item.product_name, name: item.product_name, quantity: item.quantity, unitPrice: Number(item.unit_price) })) })));
    if (customerRows) setCustomers(customerRows.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone, address: customer.address, createdAt: customer.created_at, updatedAt: customer.updated_at })));
  }

  function notifySaved() { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    if (!configured) { setAuthenticated(true); return; }
    const data = new FormData(event.currentTarget);
    const client = createClient();
    const { data: session, error } = await client.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) });
    if (error || !session.user) { setAuthError("Não foi possível entrar. Confira e-mail e senha."); return; }
    const { data: membership } = await client.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (!membership) {
      await client.auth.signOut();
      setAuthError("Esta conta não tem permissão de administrador.");
      return;
    }
    setAuthenticated(true);
    await loadRemoteData();
  }

  async function logout() {
    if (configured) await createClient().auth.signOut();
    setAuthenticated(false);
  }

  function persist(next: Product[]) {
    setProducts(next); localStore.saveProducts(next); notifySaved();
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const photo = data.get("photo");
    let imageUrl = editing?.imageUrl;
    const productId = editing?.id || crypto.randomUUID();
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > 1_500_000) { setAuthError("A foto deve ter no máximo 1,5 MB no modo demonstração."); return; }
      if (configured) {
        const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${productId}/${Date.now()}.${extension}`;
        const client = createClient();
        const { error } = await client.storage.from("product-images").upload(path, photo, { contentType: photo.type, upsert: false });
        if (error) { window.alert(`Não foi possível enviar a foto: ${error.message}`); return; }
        imageUrl = client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      } else imageUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(photo); });
    }
    const price = Number(data.get("price"));
    const oldPrice = Number(data.get("oldPrice")) || undefined;
    if (oldPrice !== undefined && oldPrice <= price) { window.alert("O preço anterior precisa ser maior que o preço promocional atual."); return; }
    const product: Product = {
      id: productId,
      name: String(data.get("name")), description: String(data.get("description")),
      price, oldPrice,
      category: String(data.get("category")) as Category, badge: String(data.get("badge")) || undefined,
      emoji: String(data.get("emoji")) || "🍻", imageUrl, stock: Number(data.get("stock")), active: editing?.active ?? true,
    };
    if (configured) {
      const { error } = await createClient().from("products").upsert({ id: product.id, name: product.name, description: product.description ?? "", image_url: product.imageUrl ?? null, price: product.price, old_price: product.oldPrice ?? null, category: product.category, badge: product.badge ?? null, emoji: product.emoji, active: product.active, stock: product.stock });
      if (error) { window.alert(`Não foi possível salvar: ${error.message}`); return; }
      await loadRemoteData(); notifySaved();
    } else persist(editing ? products.map((item) => item.id === product.id ? product : item) : [product, ...products]);
    setEditing(null);
  }

  async function toggleProduct(product: Product) {
    if (configured) { const { error } = await createClient().from("products").update({ active: !product.active }).eq("id", product.id); if (error) { window.alert(error.message); return; } await loadRemoteData(); notifySaved(); }
    else persist(products.map((item) => item.id === product.id ? { ...item, active: !item.active } : item));
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir ${product.name}?`)) return;
    if (configured) { const { error } = await createClient().from("products").delete().eq("id", product.id); if (error) { window.alert(error.message); return; } await loadRemoteData(); notifySaved(); }
    else persist(products.filter((item) => item.id !== product.id));
  }

  async function saveOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingOrder) return;
    const data = new FormData(event.currentTarget);
    const paymentStatus = String(data.get("paymentStatus")) as Order["paymentStatus"];
    const requestedStatus = String(data.get("status")) as Order["status"];
    const status = requestedStatus === "Cancelado" ? "Cancelado" : paymentStatus === "Pago" && requestedStatus === "Novo" ? "Confirmado" : requestedStatus;
    const updated: Order = { ...editingOrder, status, paymentStatus: status === "Cancelado" ? "Cancelado" : paymentStatus, etaMinutes: Number(data.get("etaMinutes")) || undefined, deliveryNote: String(data.get("deliveryNote")), updatedAt: new Date().toISOString() };
    if (configured) {
      const { error } = await createClient().from("orders").update({ status: updated.status, payment_status: updated.paymentStatus, eta_minutes: updated.etaMinutes ?? null, delivery_note: updated.deliveryNote ?? null, updated_at: updated.updatedAt }).eq("id", updated.databaseId);
      if (error) { window.alert(error.message); return; }
      await loadRemoteData(); setEditingOrder(null); notifySaved(); return;
    }
    const next = orders.map((order) => order.id === updated.id ? updated : order);
    if (editingOrder.status !== updated.status && (editingOrder.status === "Cancelado" || updated.status === "Cancelado")) {
      const restoring = updated.status === "Cancelado";
      const quantities = new Map(updated.items?.map((item) => [item.productId, item.quantity]) ?? []);
      const nextProducts = products.map((product) => ({ ...product, stock: Math.max(0, product.stock + (restoring ? 1 : -1) * (quantities.get(product.id) ?? 0)) }));
      setProducts(nextProducts); localStore.saveProducts(nextProducts);
    }
    setOrders(next); localStore.saveOrders(next); setEditingOrder(null); notifySaved();
  }

  const paidOrders = useMemo(() => orders.filter((order) => order.paymentStatus === "Pago" && order.status !== "Cancelado"), [orders]);
  const weekly = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""), value: paidOrders.filter((order) => order.createdAt.slice(0, 10) === key).reduce((sum, order) => sum + order.total, 0) };
  }), [paidOrders]);
  const paidThisMonth = paidOrders.filter((order) => { const created = new Date(order.createdAt); const now = new Date(); return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear(); });
  const monthTotal = paidThisMonth.reduce((sum, order) => sum + order.total, 0);
  const maxWeek = Math.max(...weekly.map((day) => day.value), 1);
  const sortedOrders = useMemo(() => [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [orders]);

  if (!authenticated) return <main className="admin-login"><section><Link href="/"><BrandMark /></Link><div className="login-copy"><p className="eyebrow">Área reservada</p><h1>CONTROLE<br />DO CORRE.</h1><p>Produtos, promoções e vendas em um só lugar.</p></div><form onSubmit={login}>{configured ? <><label>E-mail<input name="email" type="email" autoComplete="email" required /></label><label>Senha<input name="password" type="password" autoComplete="current-password" required /></label></> : <div className="demo-banner"><b>Modo demonstração</b><span>O Supabase ainda não foi configurado. Os dados ficam salvos neste navegador.</span></div>}{authError && <p className="form-error">{authError}</p>}<button className="checkout-button" type="submit">{configured ? "Entrar no painel" : "Explorar painel demo"}</button><Link href="/" className="back-link"><ArrowLeft /> Voltar para a loja</Link></form></section><div className="login-art"><span>G</span><small>DONO DO<br />PRÓPRIO CORRE</small></div></main>;

  return <main className="admin-shell">
    <aside className="admin-sidebar"><BrandMark compact /><nav><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard /> Visão geral</button><button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><Package /> Produtos</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ShoppingBag /> Pedidos</button><button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><Users /> Clientes</button></nav><div><Link href="/"><Eye /> Ver loja</Link><button onClick={logout}><LogOut /> Sair</button></div></aside>
    <section className="admin-content">
      <header><div><p>G Delivery • Gonçalves Dias</p><h1>{tab === "overview" ? "VISÃO GERAL" : tab === "products" ? "PRODUTOS" : tab === "orders" ? "PEDIDOS" : "CLIENTES"}</h1></div><span className={`sync-badge ${configured ? "online" : ""}`}><i />{configured ? "Supabase conectado" : "Dados locais"}</span></header>
      {saved && <div className="save-toast"><Check /> Alterações salvas</div>}
      {tab === "overview" && <>
        <div className="metric-grid"><article><span>Vendas pagas no mês</span><strong>{money.format(monthTotal)}</strong><small><TrendingUp /> Somente pedidos marcados como pagos</small></article><article><span>Pedidos hoje</span><strong>{orders.filter((order) => order.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length}</strong><small>acompanhe em tempo real</small></article><article><span>Ticket médio pago</span><strong>{money.format(paidThisMonth.length ? monthTotal / paidThisMonth.length : 0)}</strong><small>por pedido pago no mês</small></article><article className="yellow-metric"><span>Itens ativos</span><strong>{products.filter((product) => product.active).length}</strong><small>de {products.length} cadastrados</small></article></div>
        <div className="dashboard-grid"><article className="chart-card"><div className="card-title"><div><small>Últimos 7 dias</small><h2>VENDAS DA SEMANA</h2></div><BarChart3 /></div><div className="bar-chart">{weekly.map((day) => <div key={day.label}><span className="bar-value">{day.value ? money.format(day.value).replace("R$ ", "") : "—"}</span><i style={{ height: `${Math.max((day.value / maxWeek) * 100, day.value ? 12 : 3)}%` }} /><b>{day.label}</b></div>)}</div></article><RecentOrders orders={orders.slice(0, 4)} /></div>
      </>}
      {tab === "products" && <section className="admin-card"><div className="admin-card-header"><div><small>Cardápio</small><h2>{products.length} produtos cadastrados</h2></div><button className="primary-cta" onClick={() => setEditing({ id: "", name: "", description: "", price: 0, category: "Cervejas", emoji: "🍻", active: true, stock: 0 })}><Plus /> Novo produto</button></div><div className="product-table">{products.map((product) => <article key={product.id}><span className="table-emoji">{product.emoji}</span><div><h3>{product.name}</h3><small>{product.category} • Estoque: {product.stock}</small></div><strong>{money.format(product.price)}</strong><button className={`visibility ${product.active ? "active" : ""}`} onClick={() => void toggleProduct(product)} aria-label={product.active ? "Ocultar produto" : "Exibir produto"}>{product.active ? <Eye /> : <EyeOff />}</button><button className="icon-action" onClick={() => setEditing(product)} aria-label="Editar produto"><Edit3 /></button><button className="icon-action danger" onClick={() => void deleteProduct(product)} aria-label="Excluir produto"><Trash2 /></button></article>)}</div></section>}
      {tab === "orders" && <section className="admin-card"><div className="admin-card-header"><div><small>Do mais recente para o mais antigo</small><h2>Pedidos por data e horário</h2></div></div><div className="orders-table"><div className="orders-head"><span>Pedido / horário</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Status e ações</span></div>{sortedOrders.map((order) => <article key={order.id}><b>{order.id}<small className="order-time">{new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small></b><span>{order.customer}<small>{order.address}</small></span><span>{order.itemCount}</span><strong>{money.format(order.total)}</strong><div className="order-admin-action"><span className="payment-badge" data-payment={order.paymentStatus}>{order.paymentStatus}</span><b data-status={order.status}>{order.status}</b><a className="whatsapp-action" href={whatsappUrl(order.phone, order.id)} target="_blank" rel="noreferrer" aria-label={`Chamar ${order.customer} no WhatsApp`}><MessageCircle /></a><button className="icon-action" onClick={() => setEditingOrder(order)} aria-label={`Ver detalhes de ${order.id}`}><Eye /></button></div></article>)}</div></section>}
      {tab === "customers" && <section className="admin-card"><div className="admin-card-header"><div><small>Cadastros salvos nos pedidos</small><h2>{customers.length} clientes cadastrados</h2></div></div><div className="customers-table">{[...customers].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map((customer) => { const customerOrders = orders.filter((order) => order.customerId === customer.id || order.phone.replace(/\D/g, "") === customer.phone.replace(/\D/g, "")); const spent = customerOrders.reduce((sum, order) => sum + order.total, 0); return <article key={customer.id}><div><b>{customer.name}</b><small>{customer.phone}</small><small>{customer.address}</small></div><span><b>{customerOrders.length}</b><small>pedidos</small></span><span><b>{money.format(spent)}</b><small>total comprado</small></span><a className="whatsapp-action" href={whatsappUrl(customer.phone)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></article>; })}</div></section>}
    </section>
    {editing && <div className="modal-layer"><button className="drawer-backdrop" onClick={() => setEditing(null)} aria-label="Fechar formulário" /><form className="product-form" onSubmit={saveProduct}><header><div><small>Cardápio</small><h2>{editing.id ? "EDITAR PRODUTO" : "NOVO PRODUTO"}</h2></div><button type="button" onClick={() => setEditing(null)}><X /></button></header><div className="form-grid"><label className="wide">Nome<input name="name" required defaultValue={editing.name} /></label><label className="wide">Descrição (opcional)<input name="description" defaultValue={editing.description} /></label><label className="wide">Foto do produto (opcional)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>{editing.imageUrl && <div className="wide photo-preview" style={{ backgroundImage: `url(${editing.imageUrl})` }} />}<label>Preço<input name="price" type="number" step="0.01" min="0" required defaultValue={editing.price} /></label><label>Preço anterior<input name="oldPrice" type="number" step="0.01" min="0" defaultValue={editing.oldPrice} /></label><label>Quantidade em estoque<input name="stock" type="number" min="0" required defaultValue={editing.stock} /></label><label>Emoji (sem foto)<input name="emoji" maxLength={4} defaultValue={editing.emoji} /></label><label className="wide">Categoria<select name="category" defaultValue={editing.category}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="wide">Selo promocional<input name="badge" placeholder="Ex.: Oferta, Mais pedido" defaultValue={editing.badge} /></label></div><button className="checkout-button" type="submit"><Save /> Salvar produto</button></form></div>}
    {editingOrder && <div className="modal-layer"><button className="drawer-backdrop" onClick={() => setEditingOrder(null)} aria-label="Fechar edição" /><form className="product-form order-admin-detail" onSubmit={saveOrder}><header><div><small>Pedido feito em {new Date(editingOrder.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small><h2>{editingOrder.id}</h2></div><button type="button" onClick={() => setEditingOrder(null)}><X /></button></header><div className="order-summary"><b>{editingOrder.customer}</b><span>{editingOrder.address}</span><span>{editingOrder.phone} • {editingOrder.payment}</span><span className="payment-badge" data-payment={editingOrder.paymentStatus}>{editingOrder.paymentStatus}</span><a className="whatsapp-button" href={whatsappUrl(editingOrder.phone, editingOrder.id)} target="_blank" rel="noreferrer"><MessageCircle /> Chamar no WhatsApp</a></div><div className="admin-order-items"><h3>Itens do pedido</h3>{editingOrder.items?.length ? editingOrder.items.map((item) => <div key={item.productId}><span>{item.quantity}x</span><b>{item.name}</b><small>{money.format(item.unitPrice)} cada</small><strong>{money.format(item.quantity * item.unitPrice)}</strong></div>) : <p>Os itens deste pedido demonstrativo antigo não estavam registrados.</p>}<div className="admin-order-total"><span>Total calculado</span><strong>{money.format(editingOrder.items?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? editingOrder.total)}</strong></div></div>{editingOrder.customerNote && <div className="customer-note"><b>Observações do cliente</b><p>{editingOrder.customerNote}</p></div>}<div className="form-grid"><label className="wide">Andamento do pedido<select name="status" defaultValue={editingOrder.status}><option>Novo</option><option>Confirmado</option><option>Em preparo</option><option>Saiu para entrega</option><option>Entregue</option><option>Cancelado</option></select></label><label className="wide">Situação do pagamento<select name="paymentStatus" defaultValue={editingOrder.paymentStatus}><option>Aguardando pagamento</option><option>Pago</option><option>Pagamento na entrega</option><option>Cancelado</option></select></label><label>Previsão em minutos<input name="etaMinutes" type="number" min="1" max="240" defaultValue={editingOrder.etaMinutes} /></label><label className="wide">Atualização da entrega<textarea name="deliveryNote" placeholder="Ex.: Entregador saiu da loja" defaultValue={editingOrder.deliveryNote} /></label></div><button className="checkout-button" type="submit"><Save /> Atualizar para o cliente</button></form></div>}
  </main>;
}

function RecentOrders({ orders }: { orders: Order[] }) {
  return <article className="recent-card"><div className="card-title"><div><small>Agora</small><h2>PEDIDOS RECENTES</h2></div><ShoppingBag /></div>{orders.map((order) => <div className="recent-order" key={order.id}><span>{order.id}<small>{order.customer} • {order.itemCount} itens</small></span><strong>{money.format(order.total)}</strong><b data-status={order.status}>{order.status}</b></div>)}</article>;
}
