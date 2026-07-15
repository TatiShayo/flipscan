-- Metering hardening (REVIEW_FINDINGS.md H3, H4, M1).
--
-- H3: consume/refund were keyed ONLY on the client-supplied device_hash, letting an
--     authenticated attacker replay another device's hash to drain its purchased credits.
--     Now: a row owned by a different user is never consumed/refunded.
-- H4: refund always restored a FREE credit even when a TOP-UP credit was consumed.
--     Now: consume reports which bucket it spent (used_topup) and refund restores that bucket.
-- M1: grant_topup_scans updated every row for the user (double-grant on multi-device).
--     Now: the grant lands on exactly one row (most recently active).

drop function if exists public.consume_scan_credit(text, uuid, int);
create or replace function public.consume_scan_credit(
  p_device_hash text,
  p_user_id uuid,
  p_free_limit int default 3
)
returns table (allowed boolean, free_used int, topup_remaining int, used_topup boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.scan_credits%rowtype;
  v_had_topup boolean;
begin
  insert into public.scan_credits (device_hash, user_id)
  values (p_device_hash, p_user_id)
  on conflict (device_hash) do update
    set user_id = coalesce(public.scan_credits.user_id, excluded.user_id),
        updated_at = now();

  -- ownership guard: never operate on a row that belongs to a different user (H3)
  select * into rec from public.scan_credits where device_hash = p_device_hash;
  if rec.user_id is not null and rec.user_id <> p_user_id then
    return query select false, 0, 0, false;
    return;
  end if;

  v_had_topup := rec.topup_scans_remaining > 0;

  -- single atomic conditional update
  update public.scan_credits sc
  set topup_scans_remaining = case when sc.topup_scans_remaining > 0 then sc.topup_scans_remaining - 1 else sc.topup_scans_remaining end,
      free_scans_used = case when sc.topup_scans_remaining > 0 then sc.free_scans_used
                             when sc.free_scans_used < p_free_limit then sc.free_scans_used + 1
                             else sc.free_scans_used end,
      updated_at = now()
  where sc.device_hash = p_device_hash
    and (sc.user_id is null or sc.user_id = p_user_id)
    and (sc.topup_scans_remaining > 0 or sc.free_scans_used < p_free_limit)
  returning * into rec;

  if rec.id is null then
    select * into rec from public.scan_credits where device_hash = p_device_hash;
    return query select false, rec.free_scans_used, rec.topup_scans_remaining, false;
  else
    return query select true, rec.free_scans_used, rec.topup_scans_remaining, v_had_topup;
  end if;
end;
$$;
revoke all on function public.consume_scan_credit(text, uuid, int) from public;

-- Refund the SAME bucket the credit was consumed from, scoped to the caller's row (H3+H4).
drop function if exists public.refund_scan_credit(text);
create or replace function public.refund_scan_credit(
  p_device_hash text,
  p_user_id uuid,
  p_used_topup boolean default false
)
returns void language sql security definer set search_path = public as $$
  update public.scan_credits
  set topup_scans_remaining = case when p_used_topup then topup_scans_remaining + 1 else topup_scans_remaining end,
      free_scans_used = case when p_used_topup then free_scans_used else greatest(free_scans_used - 1, 0) end,
      updated_at = now()
  where device_hash = p_device_hash
    and (user_id is null or user_id = p_user_id);
$$;
revoke all on function public.refund_scan_credit(text, uuid, boolean) from public;

-- Grant exactly one row per event (M1): prefer the most recently active device row.
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
  where id = (
    select id from public.scan_credits
    where user_id = p_user_id
    order by updated_at desc
    limit 1
  );
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
