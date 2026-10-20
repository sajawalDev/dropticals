-- =========================================================
-- Dr's Opticals: database schema
--
-- Run this whole file once in Supabase > SQL Editor > New query.
-- It is safe to run again: tables, policies and triggers are
-- created only when missing, and the sample catalogue is only
-- added the first time.
--
-- What it sets up:
--   1. Admin accounts, login attempts and admin settings
--   2. Filters: categories, shapes, materials, colours
--   3. Products, product colours and product photos
--   4. The announcement bar at the top of the site
--   5. Orders and order items
--   6. Row level security (customers read the catalogue only;
--      orders and admin data are reachable with the service key only)
--   7. Realtime: tables added to the supabase_realtime publication,
--      plus database broadcasts the dashboard listens to
--   8. Storage buckets for product photos and prescriptions
--   9. The current catalogue as starting data
--
-- The admin account is added separately (see the admin SQL you
-- were given), so no password hash is ever stored in git.
-- =========================================================


-- ---------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------
-- 1. Admin
-- ---------------------------------------------------------

create table if not exists public.admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  name          text not null default 'Admin',
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint admin_users_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint admin_users_bcrypt_hash check (password_hash ~ '^\$2[aby]\$[0-9]{2}\$.{53}$')
);
create unique index if not exists admin_users_email_key on public.admin_users (lower(email));

create table if not exists public.admin_login_attempts (
  id         bigint generated always as identity primary key,
  email      text not null,
  ip         text,
  success    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists admin_login_attempts_email_idx on public.admin_login_attempts (lower(email), created_at desc);
create index if not exists admin_login_attempts_ip_idx on public.admin_login_attempts (ip, created_at desc);

create table if not exists public.admin_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- A long random channel name for the dashboard's live order feed.
-- Only the server (service key) can read it.
insert into public.admin_settings (key, value)
values ('realtime_topic', 'admin-' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;


-- ---------------------------------------------------------
-- 2. Filters
-- ---------------------------------------------------------

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(btrim(name)) between 1 and 60),
  description text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- `base` is the built-in outline used to draw the frame and fit it in the Live Mirror.
create table if not exists public.shapes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(btrim(name)) between 1 and 60),
  description text not null default '',
  base        text not null default 'round'
              check (base in ('aviator', 'square', 'rectangle', 'round', 'cateye', 'oval', 'wayfarer', 'geometric', 'browline')),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- `base` sets the rim thickness, bridge and nose pads of the drawing.
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(btrim(name)) between 1 and 60),
  short_name  text not null default '',
  base        text not null default 'acetate' check (base in ('acetate', 'tr90', 'metal', 'combo')),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Frame colours. `style` and `hex` decide how the colour is painted on the drawings.
create table if not exists public.colors (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (length(btrim(name)) between 1 and 60),
  style       text not null default 'solid' check (style in ('gloss', 'solid', 'clear', 'tint', 'tortoise', 'metal')),
  hex         text not null default '#000000' check (hex ~ '^#[0-9a-f]{6}$'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ---------------------------------------------------------
-- 3. Products
-- ---------------------------------------------------------

create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (length(btrim(name)) between 1 and 80),
  code             text unique,
  description      text not null default '',
  price            integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= 0),
  tag              text,
  gender           text not null default 'unisex' check (gender in ('men', 'women', 'unisex')),
  category_id      uuid references public.categories (id) on delete set null,
  shape_id         uuid references public.shapes (id) on delete set null,
  material_id      uuid references public.materials (id) on delete set null,
  lens_width       smallint not null default 50 check (lens_width between 30 and 80),
  lens_height      smallint not null default 40 check (lens_height between 20 and 70),
  bridge           smallint not null default 18 check (bridge between 10 and 30),
  temple           smallint not null default 145 check (temple between 100 and 170),
  in_stock         boolean not null default true,
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_shape_idx on public.products (shape_id);
create index if not exists products_material_idx on public.products (material_id);
create index if not exists products_listing_idx on public.products (is_active, sort_order);

-- The colours a product comes in, in order. `metal_color_id` is the lower rim
-- colour of acetate-and-metal frames.
create table if not exists public.product_colors (
  product_id     uuid not null references public.products (id) on delete cascade,
  color_id       uuid not null references public.colors (id) on delete cascade,
  metal_color_id uuid references public.colors (id) on delete set null,
  position       smallint not null default 0,
  primary key (product_id, color_id)
);
create index if not exists product_colors_color_idx on public.product_colors (color_id);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null,
  url        text not null,
  alt        text not null default '',
  color_id   uuid references public.colors (id) on delete set null,
  width      integer,
  height     integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);


-- ---------------------------------------------------------
-- 4. Announcement bar
-- ---------------------------------------------------------

create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  message       text not null check (length(btrim(message)) between 1 and 200),
  short_message text not null default '' check (length(short_message) <= 90),
  icon          text not null default 'camera',
  link_label    text not null default '',
  link_href     text not null default '',
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ---------------------------------------------------------
-- 5. Orders
-- ---------------------------------------------------------

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_no         text not null unique,
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method   text not null check (payment_method in ('cod', 'bank')),
  payment_status   text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  customer_name    text not null,
  phone            text not null,
  email            text not null default '',
  address          text not null,
  city             text not null,
  postcode         text not null default '',
  subtotal         integer not null check (subtotal >= 0),
  delivery_fee     integer not null default 0 check (delivery_fee >= 0),
  total            integer not null check (total >= 0),
  item_count       integer not null default 0,
  has_prescription boolean not null default false,
  admin_note       text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  product_slug  text not null,
  product_name  text not null,
  product_code  text not null default '',
  color_slug    text not null default '',
  color_name    text not null default '',
  vision        text not null check (vision in ('zero', 'rx')),
  lens          text not null,
  lens_label    text not null,
  frame_price   integer not null check (frame_price >= 0),
  lens_price    integer not null check (lens_price >= 0),
  unit_price    integer not null check (unit_price >= 0),
  qty           integer not null check (qty between 1 and 20),
  image_url     text,
  rx_path       text,
  rx_file_name  text,
  rx_pd         text not null default '',
  rx_note       text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- Creates an order and its items in one transaction, with a unique order number.
-- Prices are worked out by the server before this is called.
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_no text;
  v_id uuid;
begin
  loop
    v_no := 'DO-' || (100000 + floor(random() * 900000))::int::text;
    exit when not exists (select 1 from public.orders o where o.order_no = v_no);
  end loop;

  insert into public.orders (
    order_no, payment_method, customer_name, phone, email, address, city, postcode,
    subtotal, delivery_fee, total, item_count, has_prescription
  ) values (
    v_no,
    p_order ->> 'payment_method',
    p_order ->> 'customer_name',
    p_order ->> 'phone',
    coalesce(p_order ->> 'email', ''),
    p_order ->> 'address',
    p_order ->> 'city',
    coalesce(p_order ->> 'postcode', ''),
    (p_order ->> 'subtotal')::integer,
    (p_order ->> 'delivery_fee')::integer,
    (p_order ->> 'total')::integer,
    (p_order ->> 'item_count')::integer,
    coalesce((p_order ->> 'has_prescription')::boolean, false)
  )
  returning id into v_id;

  insert into public.order_items (
    order_id, product_id, product_slug, product_name, product_code, color_slug, color_name,
    vision, lens, lens_label, frame_price, lens_price, unit_price, qty, image_url,
    rx_path, rx_file_name, rx_pd, rx_note
  )
  select
    v_id,
    nullif(i ->> 'product_id', '')::uuid,
    i ->> 'product_slug',
    i ->> 'product_name',
    coalesce(i ->> 'product_code', ''),
    coalesce(i ->> 'color_slug', ''),
    coalesce(i ->> 'color_name', ''),
    i ->> 'vision',
    i ->> 'lens',
    i ->> 'lens_label',
    (i ->> 'frame_price')::integer,
    (i ->> 'lens_price')::integer,
    (i ->> 'unit_price')::integer,
    (i ->> 'qty')::integer,
    nullif(i ->> 'image_url', ''),
    nullif(i ->> 'rx_path', ''),
    nullif(i ->> 'rx_file_name', ''),
    coalesce(i ->> 'rx_pd', ''),
    coalesce(i ->> 'rx_note', '')
  from jsonb_array_elements(p_items) as i;

  return jsonb_build_object('id', v_id, 'order_no', v_no);
end;
$$;

-- Numbers for the dashboard: totals, orders by status, a daily series and product counts.
-- Days are counted in Pakistan time.
create or replace function public.admin_stats(p_days integer default 14)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (now() at time zone 'Asia/Karachi')::date as today
  ),
  daily as (
    select (o.created_at at time zone 'Asia/Karachi')::date as day,
           count(*) as orders,
           coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as revenue
    from public.orders o
    where o.created_at >= now() - make_interval(days => p_days * 2 + 1)
    group by 1
  )
  select jsonb_build_object(
    'orders_total', (select count(*) from public.orders),
    'orders_by_status', (
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (select status, count(*) as n from public.orders group by status) s
    ),
    'revenue_total', (select coalesce(sum(total), 0) from public.orders where status <> 'cancelled'),
    'period', jsonb_build_object(
      'days', p_days,
      'orders', (select coalesce(sum(d.orders), 0) from daily d, bounds b where d.day > b.today - p_days),
      'revenue', (select coalesce(sum(d.revenue), 0) from daily d, bounds b where d.day > b.today - p_days),
      'orders_prev', (select coalesce(sum(d.orders), 0) from daily d, bounds b where d.day <= b.today - p_days and d.day > b.today - p_days * 2),
      'revenue_prev', (select coalesce(sum(d.revenue), 0) from daily d, bounds b where d.day <= b.today - p_days and d.day > b.today - p_days * 2)
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'orders', coalesce(d.orders, 0), 'revenue', coalesce(d.revenue, 0)) order by g.day), '[]'::jsonb)
      from bounds b
      cross join lateral generate_series((b.today - (p_days - 1))::timestamp, b.today::timestamp, interval '1 day') as gs(ts)
      cross join lateral (select gs.ts::date as day) g
      left join daily d on d.day = g.day
    ),
    'products', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where is_active),
        'hidden', count(*) filter (where not is_active),
        'out_of_stock', count(*) filter (where is_active and not in_stock),
        'featured', count(*) filter (where is_active and is_featured)
      )
      from public.products
    )
  );
$$;


-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['admin_users', 'categories', 'shapes', 'materials', 'colors', 'products', 'announcements', 'orders'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;


-- ---------------------------------------------------------
-- 6. Row level security
-- ---------------------------------------------------------

alter table public.admin_users          enable row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.admin_settings       enable row level security;
alter table public.categories           enable row level security;
alter table public.shapes               enable row level security;
alter table public.materials            enable row level security;
alter table public.colors               enable row level security;
alter table public.products             enable row level security;
alter table public.product_colors       enable row level security;
alter table public.product_images       enable row level security;
alter table public.announcements        enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;

-- The storefront may read the catalogue. Nobody but the server may write.
drop policy if exists "Catalogue: read categories" on public.categories;
create policy "Catalogue: read categories" on public.categories for select to anon, authenticated using (true);

drop policy if exists "Catalogue: read shapes" on public.shapes;
create policy "Catalogue: read shapes" on public.shapes for select to anon, authenticated using (true);

drop policy if exists "Catalogue: read materials" on public.materials;
create policy "Catalogue: read materials" on public.materials for select to anon, authenticated using (true);

drop policy if exists "Catalogue: read colours" on public.colors;
create policy "Catalogue: read colours" on public.colors for select to anon, authenticated using (true);

drop policy if exists "Catalogue: read live products" on public.products;
create policy "Catalogue: read live products" on public.products for select to anon, authenticated using (is_active);

drop policy if exists "Catalogue: read colours of live products" on public.product_colors;
create policy "Catalogue: read colours of live products" on public.product_colors for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

drop policy if exists "Catalogue: read photos of live products" on public.product_images;
create policy "Catalogue: read photos of live products" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

drop policy if exists "Catalogue: read live announcements" on public.announcements;
create policy "Catalogue: read live announcements" on public.announcements for select to anon, authenticated using (is_active);

-- Admin accounts, settings and orders have no policies at all: only the service key reaches them.
revoke all on table public.admin_users, public.admin_login_attempts, public.admin_settings, public.orders, public.order_items
  from anon, authenticated;
revoke insert, update, delete, truncate on table
  public.categories, public.shapes, public.materials, public.colors,
  public.products, public.product_colors, public.product_images, public.announcements
  from anon, authenticated;

revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.admin_stats(integer) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;
grant execute on function public.admin_stats(integer) to service_role;


-- ---------------------------------------------------------
-- 7. Realtime
-- ---------------------------------------------------------

-- Add the tables to the supabase_realtime publication (Database > Publications),
-- with full row data on updates and deletes.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array[
    'products', 'product_colors', 'product_images', 'categories', 'shapes', 'materials', 'colors',
    'announcements', 'orders', 'order_items'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end;
$$;

-- Every change is also broadcast from the database, so screens update the moment
-- a row changes, whatever the row level security says:
--   * catalogue changes go to the public "catalog" channel (only the table name and id are sent)
--   * order changes go to the dashboard's private channel (its name is the random realtime_topic)
-- A failed broadcast never blocks the change itself.
create or replace function public.broadcast_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      text;
  v_topic   text;
  v_payload jsonb;
begin
  if tg_op = 'DELETE' then
    v_id := old.id::text;
  else
    v_id := new.id::text;
  end if;

  v_payload := jsonb_build_object('table', tg_table_name, 'op', tg_op, 'id', v_id);

  if tg_table_name = 'orders' then
    select s.value into v_topic from public.admin_settings s where s.key = 'realtime_topic';
    if v_topic is null then
      return null;
    end if;
    if tg_op <> 'DELETE' then
      v_payload := v_payload || jsonb_build_object(
        'no', new.order_no, 'total', new.total, 'status', new.status, 'name', new.customer_name
      );
    end if;
  else
    v_topic := 'catalog';
  end if;

  perform realtime.send(v_payload, 'change', v_topic, false);
  return null;
exception when others then
  raise warning 'broadcast_change on %: %', tg_table_name, sqlerrm;
  return null;
end;
$$;

revoke execute on function public.broadcast_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['products', 'product_images', 'categories', 'shapes', 'materials', 'colors', 'announcements', 'orders'] loop
    execute format('drop trigger if exists broadcast_change on public.%I', t);
    execute format(
      'create trigger broadcast_change after insert or update or delete on public.%I for each row execute function public.broadcast_change()',
      t
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------
-- 8. Storage
-- ---------------------------------------------------------

-- Product photos: public, so the shop can show them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Prescriptions: private. The dashboard opens them with short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions', 'prescriptions', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------
-- 9. Starting data (first run only)
-- ---------------------------------------------------------

do $$
begin
  if exists (select 1 from public.admin_settings where key = 'seeded_at') then
    return;
  end if;

  insert into public.categories (slug, name, description, sort_order) values
    ('eyeglasses',       'Eyeglasses',       'Frames for everyday wear, with zero-power or prescription lenses.', 1),
    ('computer-glasses', 'Computer glasses', 'Frames fitted with blue-cut lenses for long screen days.', 2),
    ('sunglasses',       'Sunglasses',       'Tinted lenses for bright days.', 3)
  on conflict (slug) do nothing;

  insert into public.shapes (slug, name, description, base, sort_order) values
    ('aviator',   'Aviator',   'Teardrop lenses and a double bridge. They balance a strong jaw and a wider forehead.', 'aviator', 1),
    ('square',    'Square',    'Even height and width with softened corners. They add structure to round, soft features.', 'square', 2),
    ('rectangle', 'Rectangle', 'Wider than they are tall. They make a round face look longer and sharper.', 'rectangle', 3),
    ('round',     'Round',     'Circular lenses with a light keyhole look. They soften angular faces.', 'round', 4),
    ('cateye',    'Cat-eye',   'The outer corners lift upward. They lift the cheekbones and draw attention to the eyes.', 'cateye', 5),
    ('oval',      'Oval',      'Gentle, low-profile curves. The quietest shape on the wall, easy on every face.', 'oval', 6),
    ('wayfarer',  'Wayfarer',  'A trapezoid with a strong upper line. Bold without being loud.', 'wayfarer', 7),
    ('geometric', 'Geometric', 'Hexagonal lenses with flat tops. A modern edge for oval and round faces.', 'geometric', 8),
    ('browline',  'Browline',  'A heavy upper brow over a fine metal rim. Classic, studious and sharp.', 'browline', 9)
  on conflict (slug) do nothing;

  insert into public.materials (slug, name, short_name, base, sort_order) values
    ('acetate', 'Acetate',           'acetate',           'acetate', 1),
    ('tr90',    'TR-90',             'TR-90',             'tr90',    2),
    ('metal',   'Metal',             'metal',             'metal',   3),
    ('combo',   'Acetate and metal', 'acetate and metal', 'combo',   4)
  on conflict (slug) do nothing;

  insert into public.colors (slug, name, style, hex, sort_order) values
    ('jet',      'Jet black',       'gloss',    '#000000', 1),
    ('matte',    'Matte black',     'solid',    '#202020', 2),
    ('crystal',  'Crystal clear',   'clear',    '#eef2f4', 3),
    ('smoke',    'Smoke grey',      'tint',     '#424246', 4),
    ('havana',   'Havana tortoise', 'tortoise', '#3b210f', 5),
    ('gold',     'Gold',            'metal',    '#c69a4a', 6),
    ('silver',   'Silver',          'metal',    '#c4c4c4', 7),
    ('gunmetal', 'Gunmetal',        'metal',    '#4d5156', 8)
  on conflict (slug) do nothing;

  insert into public.products (
    slug, name, code, description, price, tag, gender, category_id, shape_id, material_id,
    lens_width, lens_height, bridge, temple, is_featured, sort_order
  )
  select v.slug, v.name, v.code, v.description, v.price, v.tag, v.gender,
         (select c.id from public.categories c where c.slug = 'eyeglasses'),
         (select s.id from public.shapes s where s.slug = v.shape),
         (select m.id from public.materials m where m.slug = v.material),
         v.a, v.b, v.d, v.temple, v.featured, v.sort
  from (values
      ('iris', 'Iris', 'DO-101', 'Perfectly round 48 mm lenses on a keyhole-style bridge. A small, studious frame that sits light on the nose.', 3490, 'Bestseller', 'unisex', 'round', 'acetate', 48, 46, 21, 145, true, 1),
      ('meridian', 'Meridian', 'DO-102', 'The classic pilot shape with a double bridge and adjustable nose pads. Deep lenses give a wide field of view.', 4290, null, 'men', 'aviator', 'metal', 56, 48, 16, 140, true, 2),
      ('retina', 'Retina', 'DO-103', 'An upswept cat-eye cut from thick acetate. The lifted corners open up the eyes and sharpen the cheekbones.', 3990, 'New', 'women', 'cateye', 'acetate', 52, 40, 18, 140, true, 3),
      ('axis', 'Axis', 'DO-104', 'A slim rectangle in flexible TR-90 that bends instead of snapping. Built for daily commutes and long desk days.', 2990, null, 'men', 'rectangle', 'tr90', 54, 36, 17, 145, false, 4),
      ('diopter', 'Diopter', 'DO-105', 'A confident square with softened corners and a strong bridge. Equal parts sharp and friendly.', 3690, null, 'unisex', 'square', 'acetate', 50, 45, 20, 145, false, 5),
      ('cornea', 'Cornea', 'DO-106', 'A fine metal oval with a gentle arch over the nose. Nearly weightless and easy to wear all day.', 3290, null, 'women', 'oval', 'metal', 50, 38, 19, 140, true, 6),
      ('focal', 'Focal', 'DO-107', 'A modern take on the trapezoid classic, with a heavier brow line and slim lower rim.', 3490, 'Bestseller', 'unisex', 'wayfarer', 'acetate', 52, 41, 18, 145, true, 7),
      ('prism', 'Prism', 'DO-108', 'Hexagonal lenses with flat tops, drawn in thin metal. A precise, architectural frame.', 4490, 'New', 'women', 'geometric', 'metal', 49, 44, 20, 140, true, 8),
      ('sclera', 'Sclera', 'DO-109', 'A heavy acetate brow over a fine metal lower rim. The browline frame, cut with clean modern lines.', 4190, null, 'men', 'browline', 'combo', 51, 40, 20, 145, true, 9),
      ('lumen', 'Lumen', 'DO-110', 'A narrow rectangle with rounded corners. Low enough to sit under a fringe, bold enough to be noticed.', 3190, null, 'women', 'rectangle', 'acetate', 52, 34, 17, 140, false, 10),
      ('orbit', 'Orbit', 'DO-111', 'Round wire-rims with a high arched bridge and soft nose pads. A quiet classic.', 3790, null, 'unisex', 'round', 'metal', 47, 45, 21, 145, false, 11),
      ('vista', 'Vista', 'DO-112', 'A softer, slightly smaller aviator for narrower faces. Fine metal, double bridge and a light feel.', 4290, null, 'women', 'aviator', 'metal', 54, 46, 16, 140, false, 12),
      ('pupil', 'Pupil', 'DO-113', 'A petite round frame for smaller faces. Thick acetate keeps it bold at a small size.', 3290, null, 'women', 'round', 'acetate', 46, 44, 20, 140, false, 13),
      ('snellen', 'Snellen', 'DO-114', 'Named after the eye chart. A broad, thick square for wider faces, with 150 mm temples.', 3990, 'Bestseller', 'men', 'square', 'acetate', 53, 46, 19, 150, true, 14),
      ('halo', 'Halo', 'DO-115', 'A softly lifted cat-eye in clear and black acetate. Feminine without the drama.', 3590, null, 'women', 'cateye', 'acetate', 50, 39, 18, 140, false, 15),
      ('apex', 'Apex', 'DO-116', 'A larger hexagon in gunmetal or silver. Strong geometry for strong features.', 4490, null, 'men', 'geometric', 'metal', 52, 46, 19, 145, false, 16),
      ('tarsus', 'Tarsus', 'DO-117', 'A light, flexible oval in matte TR-90. The everyday frame you forget you are wearing.', 2790, null, 'men', 'oval', 'tr90', 52, 38, 18, 145, false, 17),
      ('macula', 'Macula', 'DO-118', 'A slightly smaller wayfarer with a lifted outer corner. A bold everyday frame for narrower faces.', 3490, null, 'women', 'wayfarer', 'acetate', 50, 40, 18, 140, false, 18)
  ) as v(slug, name, code, description, price, tag, gender, shape, material, a, b, d, temple, featured, sort)
  on conflict (slug) do nothing;

  insert into public.product_colors (product_id, color_id, metal_color_id, position)
  select p.id, c.id, m.id, v.pos
  from (values
      ('iris', 'jet', null, 0), ('iris', 'crystal', null, 1), ('iris', 'havana', null, 2),
      ('meridian', 'silver', null, 0), ('meridian', 'gold', null, 1), ('meridian', 'gunmetal', null, 2),
      ('retina', 'jet', null, 0), ('retina', 'havana', null, 1), ('retina', 'crystal', null, 2),
      ('axis', 'matte', null, 0), ('axis', 'smoke', null, 1), ('axis', 'jet', null, 2),
      ('diopter', 'jet', null, 0), ('diopter', 'smoke', null, 1), ('diopter', 'crystal', null, 2),
      ('cornea', 'gold', null, 0), ('cornea', 'silver', null, 1),
      ('focal', 'jet', null, 0), ('focal', 'matte', null, 1), ('focal', 'havana', null, 2),
      ('prism', 'gold', null, 0), ('prism', 'silver', null, 1), ('prism', 'gunmetal', null, 2),
      ('sclera', 'jet', 'gold', 0), ('sclera', 'havana', 'gold', 1), ('sclera', 'matte', 'silver', 2),
      ('lumen', 'crystal', null, 0), ('lumen', 'jet', null, 1), ('lumen', 'smoke', null, 2),
      ('orbit', 'gold', null, 0), ('orbit', 'silver', null, 1), ('orbit', 'gunmetal', null, 2),
      ('vista', 'gold', null, 0), ('vista', 'silver', null, 1),
      ('pupil', 'havana', null, 0), ('pupil', 'crystal', null, 1), ('pupil', 'smoke', null, 2),
      ('snellen', 'jet', null, 0), ('snellen', 'matte', null, 1), ('snellen', 'havana', null, 2),
      ('halo', 'crystal', null, 0), ('halo', 'jet', null, 1),
      ('apex', 'gunmetal', null, 0), ('apex', 'silver', null, 1),
      ('tarsus', 'matte', null, 0), ('tarsus', 'smoke', null, 1),
      ('macula', 'havana', null, 0), ('macula', 'jet', null, 1), ('macula', 'crystal', null, 2)
  ) as v(product, color, metal, pos)
  join public.products p on p.slug = v.product
  join public.colors c on c.slug = v.color
  left join public.colors m on m.slug = v.metal
  on conflict do nothing;

  insert into public.announcements (message, short_message, icon, link_label, link_href, is_active, sort_order) values
    ('See any frame on your face, live. Press **Frame My Face** on a frame.', 'Try any frame on your face, live.', 'camera', '', '', true, 1),
    ('Free delivery on every order. Pay cash when your glasses arrive.', 'Free delivery, cash on delivery.', 'truck', '', '', false, 2);

  insert into public.admin_settings (key, value) values ('seeded_at', now()::text);
end;
$$;


-- ---------------------------------------------------------
-- Check: every line below should say true
-- ---------------------------------------------------------

select
  (select count(*) from public.products) > 0 as catalogue_loaded,
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public') >= 10 as realtime_publication_ready,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'realtime' and p.proname = 'send'
  ) as realtime_broadcast_available,
  (select count(*) from storage.buckets where id in ('product-images', 'prescriptions')) = 2 as storage_buckets_ready;
