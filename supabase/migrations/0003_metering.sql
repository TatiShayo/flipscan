-- Atomic metering + usage accounting. All functions here are called ONLY by
-- edge functions using the service role; no client grants.

-- Consume one scan credit atomically (no check-then-act race).
-- Order: top-up scans first (purchased), then free scans (limit 3).
-- Returns the outcome + remaining counts.
create or replace function public.consume_scan_credit(
  p_device_hash text,
  p_user_id uuid,
  p_free_limit int default 3
)
returns table (allowed boolean, free_used int, topup_remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.scan_credits%rowtype;
begin
  insert into public.scan_credits (device_hash, user_id)
  values (p_device_hash, p_user_id)
  on conflict (device_hash) do update
    set user_id = coalesce(public.scan_credits.user_id, excluded.user_id),
        updated_at = now();

  -- single atomic conditional update
  update public.scan_credits sc
  set topup_scans_remaining = case when sc.topup_scans_remaining > 0 then sc.topup_scans_remaining - 1 else sc.topup_scans_remaining end,
      free_scans_used = case when sc.topup_scans_remaining > 0 then sc.free_scans_used
                             when sc.free_scans_used < p_free_limit then sc.free_scans_used + 1
                             else sc.free_scans_used end,
      updated_at = now()
  where sc.device_hash = p_device_hash
    and (sc.topup_scans_remaining > 0 or sc.free_scans_used < p_free_limit)
  returning * into rec;

  if rec.id is null then
    select * into rec from public.scan_credits where device_hash = p_device_hash;
    return query select false, rec.free_scans_used, rec.topup_scans_remaining;
  else
    return query select true, rec.free_scans_used, rec.topup_scans_remaining;
  end if;
end;
$$;
revoke all on function public.consume_scan_credit(text, uuid, int) from public;

-- Refund a credit if the pipeline failed after consuming one.
create or replace function public.refund_scan_credit(p_device_hash text)
returns void language sql security definer set search_path = public as $$
  update public.scan_credits
  set free_scans_used = greatest(free_scans_used - 1, 0), updated_at = now()
  where device_hash = p_device_hash;
$$;
revoke all on function public.refund_scan_credit(text) from public;

-- Atomic daily rate limit + monthly budget accounting.
-- Increments today's row and returns totals; caller compares to caps.
create or replace function public.record_ai_usage(
  p_user_id uuid,
  p_cost_usd numeric
)
returns table (scans_today int, month_cost_usd numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today int;
  v_month numeric;
begin
  insert into public.ai_usage (user_id, day, scans, est_cost_usd)
  values (p_user_id, (now() at time zone 'utc')::date, 1, p_cost_usd)
  on conflict (user_id, day) do update
    set scans = public.ai_usage.scans + 1,
        est_cost_usd = public.ai_usage.est_cost_usd + excluded.est_cost_usd
  returning scans into v_today;

  select coalesce(sum(est_cost_usd), 0) into v_month
  from public.ai_usage
  where user_id = p_user_id
    and day >= date_trunc('month', now() at time zone 'utc')::date;

  return query select v_today, v_month;
end;
$$;
revoke all on function public.record_ai_usage(uuid, numeric) from public;

-- Grant top-up scans (RevenueCat webhook, idempotent by event id).
create table public.rc_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);
alter table public.rc_events enable row level security; -- no policies: service role only

create or replace function public.grant_topup_scans(
  p_event_id text,
  p_user_id uuid,
  p_scans int
)
returns boolean -- false if event already processed
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rc_events (event_id) values (p_event_id);
  update public.scan_credits
  set topup_scans_remaining = topup_scans_remaining + p_scans, updated_at = now()
  where user_id = p_user_id;
  if not found then
    insert into public.scan_credits (device_hash, user_id, topup_scans_remaining)
    values ('user:' || p_user_id::text, p_user_id, p_scans);
  end if;
  return true;
exception when unique_violation then
  return false;
end;
$$;
revoke all on function public.grant_topup_scans(text, uuid, int) from public;
