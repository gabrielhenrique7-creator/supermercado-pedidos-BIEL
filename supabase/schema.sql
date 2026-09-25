-- G Delivery — execute no SQL Editor de um projeto Supabase.
-- Todas as tabelas expostas têm RLS e permissões explícitas.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null unique check (char_length(phone) between 8 and 30),
  address text not null check (char_length(address) between 8 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  image_url text,
  price numeric(10,2) not null check (price >= 0),
  old_price numeric(10,2) check (old_price is null or old_price >= price),
  category text not null check (category in ('Cervejas','Destilados','Sem álcool','Gelo & extras')),
  badge text,
  emoji text not null default '🍻',
  active boolean not null default true,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default ('GD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  tracking_token uuid not null unique default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 30),
  address text not null check (char_length(address) between 8 and 500),
  payment_method text not null check (payment_method in ('Pix','Cartão na entrega','Dinheiro')),
  payment_status text not null default 'Aguardando pagamento' check (payment_status in ('Aguardando pagamento','Pago','Pagamento na entrega','Cancelado')),
  status text not null default 'Novo' check (status in ('Novo','Em preparo','Saiu para entrega','Entregue')),
  total numeric(10,2) not null check (total >= 0),
  eta_minutes integer check (eta_minutes is null or eta_minutes between 1 and 240),
  delivery_note text check (delivery_note is null or char_length(delivery_note) <= 500),
  customer_note text check (customer_note is null or char_length(customer_note) <= 500),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Mantém o arquivo seguro para projetos que já executaram uma versão anterior.
alter table public.products add column if not exists image_url text;
alter table public.orders add column if not exists public_code text;
alter table public.orders add column if not exists tracking_token uuid;
update public.orders set public_code = 'GD-' || upper(substr(replace(id::text, '-', ''), 1, 6)) where public_code is null;
update public.orders set tracking_token = gen_random_uuid() where tracking_token is null;
alter table public.orders alter column public_code set default ('GD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)));
alter table public.orders alter column tracking_token set default gen_random_uuid();
create unique index if not exists orders_public_code_key on public.orders(public_code);
create unique index if not exists orders_tracking_token_key on public.orders(tracking_token);
alter table public.orders add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.orders add column if not exists eta_minutes integer check (eta_minutes is null or eta_minutes between 1 and 240);
alter table public.orders add column if not exists delivery_note text check (delivery_note is null or char_length(delivery_note) <= 500);
alter table public.orders add column if not exists customer_note text check (customer_note is null or char_length(customer_note) <= 500);
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists payment_status text not null default 'Aguardando pagamento';
update public.orders
set payment_status = case
  when status = 'Entregue' then 'Pago'
  when payment_method = 'Pix' then 'Aguardando pagamento'
  else 'Pagamento na entrega'
end
where payment_status is null
   or payment_status not in ('Aguardando pagamento','Pago','Pagamento na entrega','Cancelado')
   or (payment_status = 'Aguardando pagamento' and (status = 'Entregue' or payment_method <> 'Pix'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('Aguardando pagamento','Pago','Pagamento na entrega','Cancelado'));
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('Novo','Confirmado','Em preparo','Saiu para entrega','Entregue','Cancelado'));

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0 and quantity <= 100),
  unit_price numeric(10,2) not null check (unit_price >= 0)
);

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.admin_users a
      where a.user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.admin_users, public.customers, public.products, public.orders, public.order_items from anon, authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;

create policy "users read own admin membership" on public.admin_users for select to authenticated using ((select auth.uid()) = user_id);

create policy "admins read customers" on public.customers for select to authenticated using ((select private.is_admin()));
create policy "admins insert customers" on public.customers for insert to authenticated with check ((select private.is_admin()));
create policy "admins update customers" on public.customers for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete customers" on public.customers for delete to authenticated using ((select private.is_admin()));

create policy "public reads active products" on public.products for select to anon, authenticated using (active = true);
create policy "admins read all products" on public.products for select to authenticated using ((select private.is_admin()));
create policy "admins insert products" on public.products for insert to authenticated with check ((select private.is_admin()));
create policy "admins update products" on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete products" on public.products for delete to authenticated using ((select private.is_admin()));

create policy "admins read orders" on public.orders for select to authenticated using ((select private.is_admin()));
create policy "admins insert orders" on public.orders for insert to authenticated with check ((select private.is_admin()));
create policy "admins update orders" on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete orders" on public.orders for delete to authenticated using ((select private.is_admin()));

create policy "admins read order items" on public.order_items for select to authenticated using ((select private.is_admin()));
create policy "admins insert order items" on public.order_items for insert to authenticated with check ((select private.is_admin()));
create policy "admins update order items" on public.order_items for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete order items" on public.order_items for delete to authenticated using ((select private.is_admin()));

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists customers_updated_at_idx on public.customers(updated_at desc);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists products_active_category_idx on public.products(active, category);

-- Operação transacional chamada somente pelo servidor do site.
create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_payment_method text,
  p_customer_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_total numeric(10,2) := 0;
  v_phone text := regexp_replace(p_phone, '[^0-9]', '', 'g');
begin
  if char_length(trim(p_customer_name)) < 2 or char_length(v_phone) < 8 or char_length(trim(p_address)) < 8 then
    raise exception 'Dados do cliente inválidos';
  end if;
  if p_payment_method not in ('Pix','Cartão na entrega','Dinheiro') then raise exception 'Forma de pagamento inválida'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Sacola inválida'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 100 then raise exception 'Quantidade inválida'; end if;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and active for update;
    if not found then raise exception 'Produto indisponível'; end if;
    if v_product.stock < v_quantity then raise exception 'Estoque insuficiente para %', v_product.name; end if;
    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  insert into public.customers(name, phone, address)
  values (trim(p_customer_name), v_phone, trim(p_address))
  on conflict (phone) do update set name = excluded.name, address = excluded.address, updated_at = now()
  returning id into v_customer_id;

  insert into public.orders(customer_id, customer_name, phone, address, payment_method, payment_status, total, customer_note, eta_minutes, delivery_note)
  values (v_customer_id, trim(p_customer_name), v_phone, trim(p_address), p_payment_method, case when p_payment_method = 'Pix' then 'Aguardando pagamento' else 'Pagamento na entrega' end, v_total, nullif(trim(p_customer_note), ''), 45, 'Pedido recebido. Aguardando confirmação da loja.')
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid;
    insert into public.order_items(order_id, product_id, product_name, quantity, unit_price)
    values (v_order.id, v_product.id, v_product.name, v_quantity, v_product.price);
    update public.products set stock = stock - v_quantity, updated_at = now() where id = v_product.id;
  end loop;

  return jsonb_build_object('id', v_order.id, 'code', v_order.public_code, 'trackingToken', v_order.tracking_token, 'total', v_order.total, 'customerId', v_customer_id, 'createdAt', v_order.created_at);
end;
$$;

revoke all on function public.place_order(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text,text,text,text,text,jsonb) to service_role;

-- Fotos públicas; somente administradores autenticados podem enviar ou alterar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads product images" on storage.objects;
create policy "public reads product images" on storage.objects for select to public using (bucket_id = 'product-images');
drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and (select private.is_admin()));
drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and (select private.is_admin())) with check (bucket_id = 'product-images' and (select private.is_admin()));
drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and (select private.is_admin()));
