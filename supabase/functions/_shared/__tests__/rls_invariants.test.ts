// Security milestone — RLS + metering invariants (PLAYBOOK 2.2, BUILD_PROMPT threat model).
//
// A LIVE RLS deny-test (anon client of user A cannot read user B's rows) requires a running
// Supabase/Postgres instance, which is a NEEDS HUMAN device/account step (see
// PROJECT_STATE.md) — it cannot run in this headless environment. What we CAN do, and what
// catches the regressions that matter, is statically assert the security-critical shape of
// the migrations so a future edit that (say) drops a REVOKE or adds an over-broad policy
// fails CI. This is a real guard, not a stand-in: every property below is one an attacker
// would exploit if it regressed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(__dirname, '../../../migrations');
const init = readFileSync(join(MIGRATIONS_DIR, '0001_init.sql'), 'utf8');
const metering = readFileSync(join(MIGRATIONS_DIR, '0003_metering.sql'), 'utf8');
const hardening = readFileSync(join(MIGRATIONS_DIR, '0004_metering_hardening.sql'), 'utf8');

// The EFFECTIVE definition of each RPC — 0004 redefines three of them, so asserting the
// 0003 text alone would guard the superseded version (the exact regression that would
// silently re-open H3/H4/M1).
const EFFECTIVE_RPC_SOURCE: Record<string, string> = {
  consume_scan_credit: hardening,
  refund_scan_credit: hardening,
  record_ai_usage: metering,
  grant_topup_scans: hardening,
};

// Tables that hold user data or the "wallet" — RLS must be enabled on all of them.
const RLS_TABLES = ['scans', 'watchlist', 'scan_credits', 'ai_usage', 'scan_cache'];

// Tables the client must NEVER be able to touch directly (server/service-role only): the
// metering + usage + cache tables. They must have RLS on and NO client policy referencing
// them (default-deny with no policy => no client access).
const SERVICE_ONLY_TABLES = ['scan_credits', 'ai_usage', 'scan_cache'];

// SECURITY DEFINER RPCs that must be REVOKEd from public (only the edge function calls them).
const SERVICE_ONLY_FUNCTIONS = [
  'consume_scan_credit',
  'refund_scan_credit',
  'record_ai_usage',
  'grant_topup_scans',
];

describe('RLS is enabled on every data table', () => {
  it.each(RLS_TABLES)('%s has RLS enabled', (table) => {
    expect(init).toMatch(new RegExp(`alter table public\\.${table}\\s+enable row level security`, 'i'));
  });
});

describe('metering/usage/cache tables are service-role only (no client policy)', () => {
  it.each(SERVICE_ONLY_TABLES)('%s has no create policy statement', (table) => {
    // No `create policy ... on public.<table>` anywhere across the init migration.
    const policyOnTable = new RegExp(`create policy[\\s\\S]*?on public\\.${table}\\b`, 'i');
    expect(init).not.toMatch(policyOnTable);
  });
});

describe('owner-only policies use auth.uid() = user_id (no blanket true)', () => {
  it('scans select/update/delete are scoped to the owner', () => {
    expect(init).toMatch(/scans_select_own[\s\S]*?auth\.uid\(\)\s*=\s*user_id/i);
    expect(init).toMatch(/scans_update_own[\s\S]*?auth\.uid\(\)\s*=\s*user_id[\s\S]*?with check\s*\(auth\.uid\(\)\s*=\s*user_id\)/i);
    expect(init).toMatch(/scans_delete_own[\s\S]*?auth\.uid\(\)\s*=\s*user_id/i);
  });

  it('has NO client insert policy on scans (inserts only via the edge function)', () => {
    expect(init).not.toMatch(/create policy[\s\S]*?on public\.scans\s+for insert/i);
  });

  it('watchlist policy is owner-scoped for all operations', () => {
    expect(init).toMatch(/watchlist_all_own[\s\S]*?auth\.uid\(\)\s*=\s*user_id[\s\S]*?with check\s*\(auth\.uid\(\)\s*=\s*user_id\)/i);
  });

  it('never grants a policy with `using (true)`', () => {
    expect(init).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });
});

describe('the scan-photos bucket is private and owner-scoped', () => {
  it('creates the bucket as non-public with a size + mime cap', () => {
    expect(init).toMatch(/'scan-photos'[\s\S]*?false[\s\S]*?3145728[\s\S]*?image\/jpeg/i);
  });
  it('reads are scoped to the uploader folder', () => {
    expect(init).toMatch(/scan_photos_read_own[\s\S]*?foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i);
  });
});

describe('service-role RPCs are revoked from public (in their EFFECTIVE migration)', () => {
  it.each(SERVICE_ONLY_FUNCTIONS)('%s is REVOKEd from public', (fn) => {
    expect(EFFECTIVE_RPC_SOURCE[fn]).toMatch(
      new RegExp(`revoke all on function public\\.${fn}\\b[\\s\\S]*?from public`, 'i'),
    );
  });

  it('every service RPC is declared security definer with a pinned search_path', () => {
    for (const fn of SERVICE_ONLY_FUNCTIONS) {
      const def = new RegExp(`create or replace function public\\.${fn}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, 'i');
      expect(EFFECTIVE_RPC_SOURCE[fn]).toMatch(def);
    }
  });
});

describe('metering survives reinstall (keyed on device_hash, not client storage)', () => {
  it('scan_credits is unique on device_hash so a fresh anon user on the same device collides', () => {
    expect(init).toMatch(/scan_credits[\s\S]*?device_hash text not null[\s\S]*?unique \(device_hash\)/i);
  });

  it('consume_scan_credit does a single atomic conditional update (no check-then-act race)', () => {
    // The guard is in the UPDATE ... WHERE, not a prior SELECT — that's what makes it race-safe.
    expect(hardening).toMatch(/update public\.scan_credits[\s\S]*?where[\s\S]*?topup_scans_remaining > 0 or[\s\S]*?free_scans_used < p_free_limit/i);
  });

  it('top-up credits are consumed before free credits', () => {
    expect(hardening).toMatch(/topup_scans_remaining > 0 then sc\.topup_scans_remaining - 1/i);
  });
});

describe('metering-bypass hardening (0004: H3 ownership, H4 bucket refund, M1 single grant)', () => {
  it('H3: consume refuses a row owned by a DIFFERENT user (client device_hash is untrusted)', () => {
    // The proven exploit: replay a victim's device_hash to drain their purchased top-ups.
    expect(hardening).toMatch(/rec\.user_id is not null and rec\.user_id <> p_user_id/i);
    // ...and the atomic UPDATE itself is ownership-scoped, not just the pre-check.
    expect(hardening).toMatch(/update public\.scan_credits sc[\s\S]*?where[\s\S]*?\(sc\.user_id is null or sc\.user_id = p_user_id\)/i);
  });

  it('H3: refund is scoped to the caller\'s own row', () => {
    expect(hardening).toMatch(/create or replace function public\.refund_scan_credit\(\s*p_device_hash text,\s*p_user_id uuid/i);
    expect(hardening).toMatch(/refund_scan_credit[\s\S]*?where device_hash = p_device_hash\s*and \(user_id is null or user_id = p_user_id\)/i);
  });

  it('H4: refund restores the SAME bucket that was consumed (top-up vs free)', () => {
    expect(hardening).toMatch(/case when p_used_topup then topup_scans_remaining \+ 1/i);
    expect(hardening).toMatch(/case when p_used_topup then free_scans_used else greatest\(free_scans_used - 1, 0\)/i);
    // consume must report which bucket it spent so the caller can refund it correctly
    expect(hardening).toMatch(/returns table \(allowed boolean, free_used int, topup_remaining int, used_topup boolean\)/i);
  });

  it('M1: a top-up grant lands on exactly ONE device row', () => {
    expect(hardening).toMatch(/grant_topup_scans[\s\S]*?where id = \(\s*select id from public\.scan_credits\s*where user_id = p_user_id\s*order by updated_at desc\s*limit 1/i);
  });
});

describe('RevenueCat top-up grants are idempotent by event id', () => {
  it('inserts into rc_events (PK on event_id) and returns false on unique_violation', () => {
    expect(hardening).toMatch(/insert into public\.rc_events \(event_id\)/i);
    expect(hardening).toMatch(/exception when unique_violation then\s*return false/i);
  });
});
