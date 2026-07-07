-- Scheduled purges (pg_cron). TEST these after deploy: see supabase/tests/purge.test.sql
create extension if not exists pg_cron;

-- 24h scan cache TTL
create or replace function public.purge_scan_cache()
returns void language sql security definer set search_path = public as $$
  delete from public.scan_cache where created_at < now() - interval '24 hours';
$$;

-- 90-day photo purge: null the image_path and delete the storage object.
create or replace function public.purge_old_scan_photos()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- remove storage objects older than 90 days in the private bucket
  delete from storage.objects
  where bucket_id = 'scan-photos'
    and created_at < now() - interval '90 days';
  -- reflect purge in scan rows so the app stops requesting signed URLs
  update public.scans
  set image_path = null
  where image_path is not null
    and created_at < now() - interval '90 days';
end;
$$;

-- 13-month ai_usage retention
create or replace function public.purge_old_ai_usage()
returns void language sql security definer set search_path = public as $$
  delete from public.ai_usage where day < (now() - interval '13 months')::date;
$$;

select cron.schedule('purge-scan-cache', '17 * * * *', 'select public.purge_scan_cache()');
select cron.schedule('purge-scan-photos', '23 3 * * *', 'select public.purge_old_scan_photos()');
select cron.schedule('purge-ai-usage', '41 4 1 * *', 'select public.purge_old_ai_usage()');
