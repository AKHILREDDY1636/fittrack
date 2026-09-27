-- FitTrack database setup
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date      date not null,

  -- body
  weight_kg     numeric(5,2)  check (weight_kg between 20 and 400),
  waist_cm      numeric(5,1)  check (waist_cm between 30 and 250),

  -- nutrition
  calories      integer       check (calories between 0 and 15000),
  protein_g     numeric(6,1)  check (protein_g between 0 and 1000),
  fiber_g       numeric(5,1)  check (fiber_g between 0 and 300),
  carbs_g       numeric(6,1)  check (carbs_g between 0 and 2000),
  fat_g         numeric(6,1)  check (fat_g between 0 and 1000),
  water_l       numeric(4,2)  check (water_l between 0 and 20),

  -- activity & recovery
  steps         integer       check (steps between 0 and 200000),
  gym           boolean,
  gym_minutes   integer       check (gym_minutes between 0 and 600),
  workout       text,
  sleep_hours   numeric(4,2)  check (sleep_hours between 0 and 24),

  -- optional InBody scan
  body_fat_kg   numeric(5,1),
  body_fat_pct  numeric(4,1),
  smm_kg        numeric(5,1),
  visceral      integer,

  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, log_date)
);

create index if not exists daily_logs_user_date on public.daily_logs (user_id, log_date desc);

-- keep updated_at fresh
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists daily_logs_updated on public.daily_logs;
create trigger daily_logs_updated before update on public.daily_logs
for each row execute function public.set_updated_at();

-- Row Level Security: every user sees and edits ONLY their own rows
alter table public.daily_logs enable row level security;

drop policy if exists "own rows select" on public.daily_logs;
drop policy if exists "own rows insert" on public.daily_logs;
drop policy if exists "own rows update" on public.daily_logs;
drop policy if exists "own rows delete" on public.daily_logs;

create policy "own rows select" on public.daily_logs for select using (auth.uid() = user_id);
create policy "own rows insert" on public.daily_logs for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.daily_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.daily_logs for delete using (auth.uid() = user_id);

-- =====================================================================
-- MEALS & FOOD LIBRARY (added in v2). Safe to run again.
-- =====================================================================

-- Your personal food library. Nutrition is per 100 g, per 100 ml, or per 1 piece.
create table if not exists public.foods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (length(name) between 1 and 120),
  aliases      text,                      -- other names you type, comma separated
  unit         text not null check (unit in ('g','ml','piece')),
  piece_label  text,                      -- e.g. egg, scoop, slice (only for unit = piece)
  kcal         numeric(7,2) not null default 0 check (kcal >= 0),
  protein_g    numeric(6,2) not null default 0 check (protein_g >= 0),
  carbs_g      numeric(6,2) not null default 0 check (carbs_g >= 0),
  fat_g        numeric(6,2) not null default 0 check (fat_g >= 0),
  fiber_g      numeric(6,2) not null default 0 check (fiber_g >= 0),
  created_at   timestamptz not null default now()
);
create unique index if not exists foods_user_name on public.foods (user_id, lower(name));

create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date    date not null,
  meal_time   time not null,
  name        text not null check (length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);
create index if not exists meals_user_date on public.meals (user_id, log_date);

create table if not exists public.meal_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meal_id     uuid not null references public.meals(id) on delete cascade,
  food_id     uuid references public.foods(id) on delete set null,
  position    integer not null default 0,
  line_text   text,                      -- what you typed, e.g. "200ml milk"
  food_name   text not null,
  qty         numeric(8,2) not null,
  unit        text not null,
  kcal        numeric(7,1) not null default 0,
  protein_g   numeric(6,1) not null default 0,
  carbs_g     numeric(6,1) not null default 0,
  fat_g       numeric(6,1) not null default 0,
  fiber_g     numeric(6,1) not null default 0
);
create index if not exists meal_items_meal on public.meal_items (meal_id);

alter table public.foods      enable row level security;
alter table public.meals      enable row level security;
alter table public.meal_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['foods','meals','meal_items'] loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
