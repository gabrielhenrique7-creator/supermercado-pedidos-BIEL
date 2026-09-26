import { createAdminClient } from "@/lib/supabase/admin";

type OrderInput = {
  customer?: unknown;
  phone?: unknown;
  address?: unknown;
  payment?: unknown;
  customerNote?: unknown;
  items?: unknown;
};

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20_000) return Response.json({ error: "Pedido muito grande." }, { status: 413 });
    const body = await request.json() as OrderInput;
    const customer = text(body.customer, 120);
    const phone = text(body.phone, 30);
    const address = text(body.address, 500);
    const payment = text(body.payment, 40);
    const customerNote = text(body.customerNote, 500);
    if (customer.length < 2 || phone.replace(/\D/g, "").length < 8 || address.length < 8) return Response.json({ error: "Revise nome, WhatsApp e endereço." }, { status: 422 });
    if (!["Pix", "Cartão na entrega", "Dinheiro"].includes(payment)) return Response.json({ error: "Forma de pagamento inválida." }, { status: 422 });
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return Response.json({ error: "Sacola inválida." }, { status: 422 });
    const items = body.items.map((item) => {
      const value = item as { productId?: unknown; quantity?: unknown };
      return { product_id: text(value.productId, 60), quantity: Number(value.quantity) };
    });
    if (items.some((item) => !/^[0-9a-f-]{36}$/i.test(item.product_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) return Response.json({ error: "Há um item inválido na sacola." }, { status: 422 });
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("place_order", { p_customer_name: customer, p_phone: phone, p_address: address, p_payment_method: payment, p_customer_note: customerNote || null, p_items: items });
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível registrar o pedido.";
    const unavailable = message.includes("não configurado");
    console.error("Falha ao registrar pedido", error);
    return Response.json(
      { error: unavailable ? "A conexão segura do banco ainda não foi finalizada." : "Não foi possível registrar o pedido. Confira os itens e tente novamente." },
      { status: unavailable ? 503 : 400 },
    );
  }
}
