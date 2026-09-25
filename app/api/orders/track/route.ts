import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { tokens?: unknown };
    if (!Array.isArray(body.tokens) || body.tokens.length > 20) return Response.json({ error: "Consulta inválida." }, { status: 422 });
    const tokens = body.tokens.filter((token): token is string => typeof token === "string" && /^[0-9a-f-]{36}$/i.test(token));
    if (!tokens.length) return Response.json([]);
    const { data, error } = await createAdminClient().from("orders").select("id,public_code,tracking_token,customer_id,customer_name,phone,address,payment_method,payment_status,status,total,eta_minutes,delivery_note,customer_note,created_at,updated_at,order_items(product_id,product_name,quantity,unit_price)").in("tracking_token", tokens).order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json(data?.map((order) => ({ id: order.public_code, databaseId: order.id, trackingToken: order.tracking_token, customerId: order.customer_id, customer: order.customer_name, phone: order.phone, address: order.address, payment: order.payment_method, paymentStatus: order.payment_status, status: order.status, total: Number(order.total), etaMinutes: order.eta_minutes, deliveryNote: order.delivery_note, customerNote: order.customer_note, createdAt: order.created_at, updatedAt: order.updated_at, itemCount: order.order_items.reduce((sum, item) => sum + item.quantity, 0), items: order.order_items.map((item) => ({ productId: item.product_id ?? item.product_name, name: item.product_name, quantity: item.quantity, unitPrice: Number(item.unit_price) })) })) ?? []);
  } catch {
    return Response.json({ error: "Não foi possível atualizar os pedidos." }, { status: 503 });
  }
}
