-- FlipScan initial schema
-- Data retention windows (enforced by scheduled purge, see 0002_purge.sql):
--   scans: rows kept indefinitely (user asset / stored value), photos purged at 90 days
--   scan_credits: kept while device/user exists
--   scan_cache: 24h TTL
--   ai_usage: 13 months (budget accounting + yearly recap)

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type verdict_t as enum ('flip', 'skip', 'maybe');

-- ---------- scans ----------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_path text, -- storage path in private 'scan-photos' bucket; null after 90-day purge
  identified jsonb, -- {name, brand, model_or_era, category, condition_notes, confidence, ebay_search_keywords[], needs_better_photo?, photo_tip?}
  comps jsonb,      -- {median, low, high, count, estimated_sold, sample_listings:[{title, price, url, img}], source, is_estimate}
  buy_price numeric check (buy_price is null or (buy_price >= 0 and buy_price < 100000)),
  condition_grade text check (condition_grade in ('new_with_tags','excellent','good','fair')),
  verdict verdict_t,
  status text not null default 'complete' check (status in ('complete','failed','queued')),
  created_at timestamptz not null default now()
);
create index scans_user_created_idx on public.scans (user_id, created_at desc);

-- ---------- watchlist ----------
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_id uuid not null references public.scans (id) on delete cascade,
  note text check (char_length(note) <= 500),
  store_name text check (char_length(store_name) <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, scan_id)
);
create index watchlist_user_idx on public.watchlist (user_id, created_at desc);

-- ---------- free-scan metering (server-side, survives reinstalls) ----------
-- Keyed on BOTH anon user id and a device fingerprint hash so a reinstall
-- (new anon user, same device) cannot reset the free counter.
create table public.scan_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  device_hash text not null, -- sha256 of vendor/install-stable device identifier
  free_scans_used int not null default 0 check (free_scans_used >= 0),
  topup_scans_remaining int not null default 0 check (topup_scans_remaining >= 0),
  updated_at timestamptz not null default now(),
  unique (device_hash)
);
create index scan_credits_user_idx on public.scan_credits (user_id);

-- ---------- per-user daily rate limiting + monthly AI budget ----------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  scans int not null default 0,
  est_cost_usd numeric not null default 0,
  unique (user_id, day)
);
create index ai_usage_user_day_idx on public.ai_usage (user_id, day);

-- ---------- 24h identification cache keyed by image hash ----------
create table public.scan_cache (
  image_hash text primary key, -- sha256 of downscaled image bytes
  identified jsonb not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- RLS: default deny on every table, explicit owner-only policies.
-- scan_credits / ai_usage / scan_cache have NO client policies at all:
-- only edge functions (service role) may touch them.
-- =====================================================================
alter table public.scans enable row level security;
alter table public.watchlist enable row level security;
alter table public.scan_credits enable row level security;
alter table public.ai_usage enable row level security;
alter table public.scan_cache enable row level security;

create policy scans_select_own on public.scans
  for select using (auth.uid() = user_id);
create policy scans_update_own on public.scans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy scans_delete_own on public.scans
  for delete using (auth.uid() = user_id);
-- inserts happen only through the scan edge function (service role); no client insert policy.

create policy watchlist_all_own on public.watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- storage: private bucket for scan photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scan-photos', 'scan-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

-- Owner-only read of own photos via signed URLs; uploads only via edge function.
create policy scan_photos_read_own on storage.objects
  for select using (bucket_id = 'scan-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- self-serve data deletion ----------
-- Called from the app's "Delete my data" action (security definer runs as owner).
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.watchlist where user_id = auth.uid();
  delete from public.scans where user_id = auth.uid();
  delete from public.ai_usage where user_id = auth.uid();
  update public.scan_credits set user_id = null where user_id = auth.uid();
  -- storage objects under the user's folder are purged by the purge job (0002)
end;
$$;
revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;
