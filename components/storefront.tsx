"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Clock3, MapPin, Menu, Minus, PackageCheck, Plus, Search, ShoppingBag, X, Zap } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { LOCAL_STORE_UPDATED, localStore } from "@/lib/local-store";
import type { CartItem, Category, Order, Product } from "@/lib/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const categories: Array<"Todos" | Category> = ["Todos", "Cervejas", "Destilados", "Sem álcool", "Gelo & extras"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState<(typeof categories)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerForm, setCustomerForm] = useState({ customer: "", phone: "", address: "" });
  const [checkoutError, setCheckoutError] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let orderInterval: number | undefined;
    let productInterval: number | undefined;
    async function refreshTrackedOrders() {
      if (!configured) return;
      const stored = localStore.getOrders();
      const tokens = stored.map((order) => order.trackingToken).filter((token): token is string => Boolean(token));
      if (!tokens.length) return;
      const response = await fetch("/api/orders/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tokens }) });
      if (!response.ok) return;
      const remoteOrders = await response.json() as Order[];
      const remoteByToken = new Map(remoteOrders.map((order) => [order.trackingToken, order]));
      localStore.saveOrders(stored.map((order) => remoteByToken.get(order.trackingToken) ?? order));
      setOrders(remoteOrders);
    }
    const refresh = async () => {
      if (configured) {
        const { data } = await createClient().from("products").select("id,name,description,image_url,price,old_price,category,badge,emoji,active,stock").eq("active", true).order("created_at");
        if (data) setProducts(data.map((product) => ({ id: product.id, name: product.name, description: product.description, imageUrl: product.image_url ?? undefined, price: Number(product.price), oldPrice: product.old_price === null ? undefined : Number(product.old_price), category: product.category as Category, badge: product.badge ?? undefined, emoji: product.emoji, active: product.active, stock: product.stock })));
      } else setProducts([]);
      setOrders(localStore.getOrders().filter((order) => Boolean(order.items)));
      const savedCustomer = localStore.getCustomers().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
      if (savedCustomer) setCustomerForm({ customer: savedCustomer.name, phone: savedCustomer.phone, address: savedCustomer.address });
    };
    const frame = window.requestAnimationFrame(() => { void refresh(); });
    if (configured) {
      void refreshTrackedOrders();
      orderInterval = window.setInterval(() => void refreshTrackedOrders(), 15_000);
      productInterval = window.setInterval(() => void refresh(), 30_000);
    }
    window.addEventListener("storage", refresh);
    window.addEventListener(LOCAL_STORE_UPDATED, refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      if (orderInterval) window.clearInterval(orderInterval);
      if (productInterval) window.clearInterval(productInterval);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(LOCAL_STORE_UPDATED, refresh);
    };
  }, [configured]);

  const visible = useMemo(() => products.filter((product) => {
    const categoryMatches = category === "Todos" || product.category === category;
    const queryMatches = `${product.name} ${product.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatches && queryMatches;
  }), [products, category, query]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;

  function add(product: Product) {
    setCart((current) => {
      const exists = current.find((item) => item.id === product.id);
      return exists ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item) : [...current, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  async function finishOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError("");
    const data = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const payment = String(data.get("payment"));
    const normalizedPhone = String(data.get("phone")).replace(/\D/g, "");
    const existingCustomer = localStore.getCustomers().find((customer) => customer.phone.replace(/\D/g, "") === normalizedPhone);
    const customerId = existingCustomer?.id ?? crypto.randomUUID();
    let remote: { id?: string; code?: string; trackingToken?: string; total?: number; customerId?: string; createdAt?: string } | null = null;
    if (configured) {
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customer: String(data.get("customer")), phone: String(data.get("phone")), address: String(data.get("address")), payment, customerNote: String(data.get("customerNote") ?? ""), items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) }) });
      const result = await response.json() as { error?: string; id?: string; code?: string; trackingToken?: string; total?: number; customerId?: string; createdAt?: string };
      if (!response.ok) { setCheckoutError(result.error ?? "Não foi possível registrar o pedido."); return; }
      remote = result;
    }
    const order: Order = {
      id: remote?.code ?? `GD-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      databaseId: remote?.id,
      trackingToken: remote?.trackingToken,
      customerId: remote?.customerId ?? customerId,
      customer: String(data.get("customer")),
      phone: String(data.get("phone")),
      address: String(data.get("address")),
      payment,
      paymentStatus: payment === "Pix" ? "Aguardando pagamento" : "Pagamento na entrega",
      total: remote?.total ?? total,
      itemCount,
      createdAt: remote?.createdAt ?? now,
      status: "Novo",
      updatedAt: now,
      etaMinutes: 45,
      deliveryNote: "Pedido enviado. Aguardando confirmação da loja.",
      customerNote: String(data.get("customerNote") ?? "").trim() || undefined,
      items: cart.map((item) => ({ productId: item.id, name: item.name, quantity: item.quantity, unitPrice: item.price, imageUrl: item.imageUrl, emoji: item.emoji })),
    };
    const customers = localStore.getCustomers();
    const customerRecord = { id: customerId, name: order.customer, phone: order.phone, address: order.address, createdAt: existingCustomer?.createdAt ?? now, updatedAt: now };
    localStore.saveCustomers(existingCustomer ? customers.map((customer) => customer.id === customerId ? customerRecord : customer) : [customerRecord, ...customers]);
    localStore.saveOrders([order, ...localStore.getOrders()]);
    if (!configured) {
      const purchased = new Map(cart.map((item) => [item.id, item.quantity]));
      localStore.saveProducts(localStore.getProducts().map((product) => ({ ...product, stock: Math.max(0, product.stock - (purchased.get(product.id) ?? 0)) })));
    }
    const items = cart.map((item) => `${item.quantity}x ${item.name}`).join(", ");
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    if (phone) {
      const paymentMessage = payment === "Pix" ? "Pagamento por Pix — aguardo a chave/QR para pagar e enviar o comprovante." : `${payment} — pagamento no recebimento.`;
      const message = `Olá! Pedido ${order.id}: ${items}. Total ${money.format(order.total)}. Entrega: ${order.address}. ${paymentMessage}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
    setLastOrder(order);
    setOrdered(true);
    setCart([]);
  }

  return (
    <main>
      <header className="site-header">
        <Link href="/" aria-label="Página inicial"><BrandMark /></Link>
        <nav className={menuOpen ? "nav-open" : ""} aria-label="Navegação principal">
          <a href="#produtos">Cardápio</a><a href="#meus-pedidos">Meus pedidos</a><a href="#como-funciona">Como funciona</a><a href="#entrega">Entrega</a><Link href="/admin">Painel</Link>
        </nav>
        <div className="header-actions">
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Abrir sacola com ${itemCount} itens`}><ShoppingBag size={20} /><span>Sacola</span>{itemCount > 0 && <b>{itemCount}</b>}</button>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Zap size={15} fill="currentColor" /> A gelada de Gonçalves Dias</p>
          <h1>SEDE NÃO<br /><span>ESPERA.</span></h1>
          <p className="hero-text">Bebida gelada, gelo e aquela mistura que faltou. Você chama, a G leva.</p>
          <div className="location-card">
            <MapPin aria-hidden="true" />
            <div><small>Estamos localizados</small><strong>Mercadinho Pinheiro</strong><span>Tv. Nereu Ramos — Gonçalves Dias, MA</span></div>
            <a href="#produtos" aria-label="Ver produtos"><ArrowRight /></a>
          </div>
          <div className="hero-proof"><span><b>20–45</b><small>minutos*</small></span><i /><span><b>Gelada</b><small>de verdade</small></span><i /><span><b>Todo dia</b><small>até mais tarde</small></span></div>
        </div>
        <div className="hero-art" aria-label="Cervejas geladas e brinde">
          <div className="sun-word">GELADA</div>
          <div className="hero-video-grid">
            <figure className="hero-video-frame video-one"><video autoPlay muted loop playsInline preload="metadata" aria-label="Garrafa de cerveja na areia"><source src="/videos/cerveja-na-praia.mp4" type="video/mp4" /></video><figcaption>Do mercado para a sua resenha</figcaption></figure>
            <figure className="hero-video-frame video-two"><video autoPlay muted loop playsInline preload="metadata" aria-label="Brinde com cerveja"><source src="/videos/brinde-de-cerveja.mp4" type="video/mp4" /></video><figcaption>Gelada, do jeito certo</figcaption></figure>
          </div>
          <div className="burst">ABRIU<br />A RESENHA?</div>
          <div className="hero-sticker">chega<br /><b>trincando</b></div>
        </div>
      </section>

      <section className="ticker" aria-label="Diferenciais"><div>ENTREGA LOCAL <span>✦</span> PREÇO JUSTO <span>✦</span> BEBIDA GELADA <span>✦</span> ENTREGA LOCAL <span>✦</span> PREÇO JUSTO <span>✦</span> BEBIDA GELADA</div></section>

      <section className="shop-section" id="produtos">
        <div className="section-heading">
          <div><p className="eyebrow">Escolha sem cerimônia</p><h2>O QUE VAI<br />GELAR HOJE?</h2></div>
          <label className="search"><Search size={18} /><span className="sr-only">Buscar produtos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no cardápio" /></label>
        </div>
        <div className="category-row" role="group" aria-label="Categorias">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {visible.length ? <div className="product-grid">{visible.map((product, index) => (
          <article className={`product-card card-${index % 4}`} key={product.id}>
            <div className={`product-visual ${product.imageUrl ? "has-photo" : ""}`} style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined}><span aria-hidden="true">{product.imageUrl ? "" : product.emoji}</span>{product.badge && <b>{product.badge}</b>}</div>
            <div className="product-info"><small>{product.category} • {product.stock} disponíveis</small><h3>{product.name}</h3>{product.description && <p>{product.description}</p>}<div className="price-line"><span>{product.oldPrice && product.oldPrice > product.price && <><del>{money.format(product.oldPrice)}</del><em>{Math.round((1 - product.price / product.oldPrice) * 100)}% OFF</em></>}<strong>{money.format(product.price)}</strong></span><button onClick={() => add(product)} disabled={product.stock === 0} aria-label={`Adicionar ${product.name}`}><Plus /></button></div></div>
          </article>
        ))}</div> : <div className="empty-state"><span>🧊</span><h3>Cardápio em atualização.</h3><p>Os produtos reais aparecerão aqui assim que forem cadastrados pelo lojista.</p></div>}
      </section>

      <section className="my-orders" id="meus-pedidos">
        <div className="section-heading"><div><p className="eyebrow">Acompanhe remotamente</p><h2>MEUS PEDIDOS</h2></div><p>Veja o andamento, a previsão e todos os itens pedidos neste aparelho.</p></div>
        {orders.length ? <div className="customer-orders">{[...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((order) => <button key={order.id} onClick={() => setSelectedOrder(order)}><span><b>{order.id}</b><small>{new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small></span><span><strong>{order.status}</strong><small>{order.paymentStatus} • {order.itemCount} {order.itemCount === 1 ? "item" : "itens"} • {money.format(order.total)}</small></span><ChevronRight /></button>)}</div> : <div className="empty-state"><PackageCheck /><h3>Nenhum pedido neste aparelho.</h3><p>Depois de finalizar uma compra, o acompanhamento aparecerá aqui.</p></div>}
      </section>

      <section className="how-section" id="como-funciona">
        <div className="how-title"><p className="eyebrow">Sem complicação</p><h2>CHAMOU.<br />PAGOU.<br /><span>CHEGOU.</span></h2></div>
        <ol>
          <li><b>01</b><div><h3>Monte sua sacola</h3><p>Escolha bebidas, gelo e extras pelo site.</p></div></li>
          <li><b>02</b><div><h3>Mande o endereço</h3><p>Informe onde a resenha está acontecendo.</p></div></li>
          <li><b>03</b><div><h3>A gente corre</h3><p>Acompanhe o status em Meus pedidos e receba gelado.</p></div></li>
        </ol>
      </section>

      <section className="delivery-section" id="entrega">
        <div className="delivery-map"><div className="map-ring ring-one" /><div className="map-ring ring-two" /><MapPin size={66} fill="currentColor" /><span>MERCADINHO<br />PINHEIRO</span><small>Tv. Nereu Ramos • Gonçalves Dias — MA</small></div>
        <div><p className="eyebrow">Estamos localizados</p><h2>MERCADINHO<br />PINHEIRO.</h2><p>Estamos na Tv. Nereu Ramos, em Gonçalves Dias — MA. Fazemos entrega local sem taxa, com a previsão atualizada no andamento do pedido.</p><a href="#produtos" className="primary-cta">Pedir agora <ChevronRight /></a></div>
      </section>

      <footer><BrandMark compact /><p>Beba com moderação. Venda proibida para menores de 18 anos.</p><div><a href="#produtos">Cardápio</a><Link href="/admin">Área do lojista</Link></div></footer>

      {cartOpen && <div className="drawer-layer" role="presentation"><button className="drawer-backdrop" aria-label="Fechar sacola" onClick={() => setCartOpen(false)} /><aside className="cart-drawer" aria-label="Sua sacola">
        <div className="drawer-header"><div><small>Sua compra</small><h2>{checkout ? "FINALIZAR" : "SACOLA"}</h2></div><button onClick={() => { setCartOpen(false); setCheckout(false); setOrdered(false); }} aria-label="Fechar"><X /></button></div>
        {ordered ? <div className="order-success"><span><Check /></span><h3>Pedido enviado!</h3><p>{lastOrder?.payment === "Pix" ? "O WhatsApp da loja foi aberto. Envie a mensagem, aguarde a chave ou QR Pix e depois mande o comprovante. O dono confirmará o pagamento no painel." : "Seu pedido foi registrado com pagamento na entrega. O WhatsApp da loja foi aberto para você enviar a confirmação."}</p><button className="primary-cta" onClick={() => { setCartOpen(false); setOrdered(false); setCheckout(false); }}>Continuar comprando</button></div> : checkout ? <form className="checkout-form" onSubmit={finishOrder}>
          <label>Seu nome<input name="customer" required minLength={2} value={customerForm.customer} onChange={(event) => setCustomerForm({ ...customerForm, customer: event.target.value })} placeholder="Como podemos chamar você?" /></label>
          <label>WhatsApp<input name="phone" required inputMode="tel" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} placeholder="(99) 99999-9999" /></label>
          <label>Endereço completo<textarea name="address" required minLength={8} value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} placeholder="Rua, número, bairro e referência" /></label>
          <label>Observações do pedido (opcional)<textarea name="customerNote" maxLength={500} placeholder="Ex.: sem gelo, entregar no portão azul, levar troco para R$ 100" /></label>
          <label>Forma de pagamento<select name="payment" required><option>Pix</option><option>Cartão na entrega</option><option>Dinheiro</option></select></label>
          {checkoutError && <p className="form-error">{checkoutError}</p>}
          <div className="checkout-note">Entrega grátis em Gonçalves Dias — sem taxa de entrega.</div>
          <button className="checkout-button" type="submit">Enviar pedido <strong>{money.format(total)}</strong></button>
          <button className="text-button" type="button" onClick={() => setCheckout(false)}>Voltar para a sacola</button>
        </form> : cart.length ? <>
          <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><span>{item.emoji}</span><div><h3>{item.name}</h3><p>{money.format(item.price)}</p></div><div className="quantity"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Diminuir quantidade"><Minus /></button><b>{item.quantity}</b><button onClick={() => changeQuantity(item.id, 1)} disabled={item.quantity >= item.stock} aria-label="Aumentar quantidade"><Plus /></button></div></div>)}</div>
          <div className="cart-total"><span>Total</span><strong>{money.format(total)}</strong><small>Entrega grátis • você não paga taxa de entrega.</small><button className="checkout-button" onClick={() => setCheckout(true)}>Continuar <ArrowRight /></button></div>
        </> : <div className="empty-cart"><ShoppingBag /><h3>Sua sacola está leve.</h3><p>Escolha as bebidas e deixe o corre com a gente.</p><button className="primary-cta" onClick={() => setCartOpen(false)}>Ver cardápio</button></div>}
      </aside></div>}
      {selectedOrder && <div className="modal-layer"><button className="drawer-backdrop" onClick={() => setSelectedOrder(null)} aria-label="Fechar detalhes" /><section className="order-detail" role="dialog" aria-modal="true" aria-labelledby="order-detail-title"><header><div><small>Detalhes do pedido</small><h2 id="order-detail-title">{selectedOrder.id}</h2></div><button onClick={() => setSelectedOrder(null)} aria-label="Fechar"><X /></button></header><div className="order-progress"><strong>{selectedOrder.status}</strong><div>{["Novo", "Confirmado", "Em preparo", "Saiu para entrega", "Entregue"].map((status) => <i key={status} className={status === selectedOrder.status || ["Novo", "Confirmado", "Em preparo", "Saiu para entrega", "Entregue"].indexOf(status) < ["Novo", "Confirmado", "Em preparo", "Saiu para entrega", "Entregue"].indexOf(selectedOrder.status) ? "done" : ""} />)}</div>{selectedOrder.etaMinutes && selectedOrder.status !== "Entregue" && <p><Clock3 /> Previsão aproximada: {selectedOrder.etaMinutes} minutos</p>}<small>{selectedOrder.deliveryNote}</small></div><div className="order-detail-items">{selectedOrder.items?.map((item) => <div key={item.productId}><span>{item.emoji ?? "📦"}</span><p><b>{item.quantity}x {item.name}</b><small>{money.format(item.unitPrice)} cada</small></p><strong>{money.format(item.unitPrice * item.quantity)}</strong></div>)}</div>{selectedOrder.customerNote && <div className="customer-note"><b>Observações</b><p>{selectedOrder.customerNote}</p></div>}<dl><div><dt>Feito em</dt><dd>{new Date(selectedOrder.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</dd></div><div><dt>Entrega</dt><dd>Grátis</dd></div><div><dt>Forma de pagamento</dt><dd>{selectedOrder.payment}</dd></div><div><dt>Situação do pagamento</dt><dd><span className="payment-badge" data-payment={selectedOrder.paymentStatus}>{selectedOrder.paymentStatus}</span></dd></div><div><dt>Endereço</dt><dd>{selectedOrder.address}</dd></div><div><dt>Total</dt><dd>{money.format(selectedOrder.total)}</dd></div></dl></section></div>}
    </main>
  );
}
