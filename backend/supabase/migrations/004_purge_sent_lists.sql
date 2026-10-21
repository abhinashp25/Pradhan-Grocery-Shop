-- Migration 004: auto-purge old sent lists.
--
-- Rule from AGENTS.md section 6, item 4:
--   "Old sent lists: hide after 7 days, delete after 30."
--
-- Strategy:
--   - "hide after 7 days" is handled in the frontend query (SentLists.tsx).
--   - "delete after 30" is handled by the SQL function below.
--   - Only 'collected' and 'replaced' lists are purged. 'new' and 'ready'
--     lists are never touched — the owner must still action them.
--   - The function is SECURITY DEFINER and checks is_admin() so only the
--     owner can call it.
--   - The owner triggers it from Settings.tsx; it can also be called from
--     a Supabase scheduled function (Supabase cron) if pg_cron is enabled.

create function purge_old_sent_lists() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_deleted int;
begin
  -- Only the owner may run this.
  if not is_admin() then
    raise exception 'permission denied';
  end if;

  -- Delete closed lists and their items (cascade handles items).
  -- 'new' and 'ready' are intentionally excluded.
  delete from sent_lists
  where status in ('collected', 'replaced')
    and sent_at < now() - interval '30 days';

  get diagnostics v_deleted = row_count;

  -- Write one audit line so the owner can see when it ran.
  perform write_audit('purge_lists', 'sent_lists', v_deleted::text, null);

  return v_deleted;
end;
$$;

-- Grant to authenticated: is_admin() check inside rejects non-owners.
grant execute on function purge_old_sent_lists() to authenticated;
