create table if not exists public.app_data (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
