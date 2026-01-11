create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  name text,
  title text,
  dongteuk_id text,
  apk_id text,
  phone text,
  mobile text,
  status text default '근무',
  role text not null default 'driver',
  password text,
  password_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  product text,
  size text,
  number text unique,
  lb_code text,
  vol text,
  type text,
  status text,
  feature text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text unique,
  manager text,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notices (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  author_username text,
  author_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dispatches (
  id uuid default gen_random_uuid() primary key,
  dispatch_date date not null,
  product text,
  size text,
  vehicle_number text,
  lb_code text,
  vol text,
  tractor text,
  feature text,
  prevday text,
  driver_name text,
  depart_time text,
  work text,
  created_by text,
  updated_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dispatch_meta (
  id uuid default gen_random_uuid() primary key,
  dispatch_date date unique not null,
  off_text text,
  misc_text text,
  support_text text,
  saved_at timestamptz,
  updated_at timestamptz,
  created_by text,
  updated_by text
);

create table if not exists public.work_reports (
  id uuid default gen_random_uuid() primary key,
  user_username text not null,
  work_date date not null,
  distance numeric,
  delivery numeric,
  meal_breakfast numeric,
  meal_lunch numeric,
  meal_dinner numeric,
  meal_total numeric,
  extra numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.meal_claims (
  id uuid default gen_random_uuid() primary key,
  user_username text not null,
  claim_date date not null,
  meal_type text not null,
  amount numeric,
  image_url text,
  status text default 'requested',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.extra_claims (
  id uuid default gen_random_uuid() primary key,
  user_username text not null,
  claim_date date not null,
  amount numeric,
  memo text,
  image_url text,
  status text default 'requested',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.paystubs (
  id uuid default gen_random_uuid() primary key,
  user_username text not null,
  year integer not null,
  month integer not null,
  file_url text,
  file_name text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists public.paystub_receipts (
  id uuid default gen_random_uuid() primary key,
  paystub_id uuid references public.paystubs(id) on delete cascade,
  user_username text not null,
  signed_at timestamptz,
  signed_image_url text
);

create table if not exists public.signatures (
  id uuid default gen_random_uuid() primary key,
  user_username text unique not null,
  image_url text,
  updated_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('paystubs', 'paystubs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('meal-claims', 'meal-claims', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('extra-claims', 'extra-claims', true)
on conflict (id) do nothing;
