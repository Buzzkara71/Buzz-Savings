-- Run AFTER 202610010001_buzz.sql. Existing records and opening savings are preserved.
-- This upgrades the workspace format to version 2. Deploy the matching Buzz app.
begin;

create or replace function public.buzz_valid_profile(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare field text;
begin
  if value is null or jsonb_typeof(value) <> 'object' then return false; end if;
  foreach field in array array['fullName', 'occupation', 'location', 'bio'] loop
    if jsonb_typeof(value->field) is distinct from 'string' or length(value->>field) > 300 then return false; end if;
  end loop;
  return coalesce(value->>'avatar', '') in ('initials', 'spark', 'leaf', 'moon');
end;
$$;
revoke all on function public.buzz_valid_profile(jsonb) from public, anon, authenticated;

alter table public.buzz_profiles add column if not exists profile jsonb not null
  default '{"fullName":"","occupation":"","location":"","bio":"","avatar":"initials"}'::jsonb;
alter table public.buzz_profiles drop constraint if exists buzz_profile_details_check;
alter table public.buzz_profiles add constraint buzz_profile_details_check check (public.buzz_valid_profile(profile));
alter table public.buzz_goals add column if not exists cover text;
alter table public.buzz_goals drop constraint if exists buzz_goal_cover_check;
alter table public.buzz_goals add constraint buzz_goal_cover_check check (cover is null or cover in ('journey', 'nest', 'studio', 'horizon'));
alter table public.buzz_transactions add column if not exists goal_id text;
alter table public.buzz_transactions drop constraint if exists buzz_transactions_type_check;
alter table public.buzz_transactions add constraint buzz_transactions_type_check check (type in ('income', 'expense', 'savings'));
alter table public.buzz_transactions drop constraint if exists buzz_transactions_check;
alter table public.buzz_transactions add constraint buzz_transactions_check check (
  (type = 'income' and category in ('Salary', 'Freelance', 'Other'))
  or (type = 'expense' and category in ('Food & drinks', 'Shopping', 'Transport', 'Bills', 'Entertainment', 'Other'))
  or (type = 'savings' and category = 'Savings')
);
alter table public.buzz_transactions drop constraint if exists buzz_transaction_goal_check;
alter table public.buzz_transactions add constraint buzz_transaction_goal_check check (
  (type = 'savings' and goal_id is not null) or (type <> 'savings' and goal_id is null)
);
-- A goal must belong to the same account. Deferral permits the atomic workspace replacement.
alter table public.buzz_transactions drop constraint if exists buzz_transaction_goal_fk;
alter table public.buzz_transactions add constraint buzz_transaction_goal_fk
  foreign key (user_id, goal_id) references public.buzz_goals(user_id, id) deferrable initially deferred;
create index if not exists buzz_transactions_goal on public.buzz_transactions(user_id, goal_id) where goal_id is not null;

create or replace function public.buzz_validate_workspace(payload jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 2097152
    or payload->'version' is distinct from '2'::jsonb
    or not public.buzz_valid_profile(payload->'profile')
    or not public.buzz_is_text(payload->'name')
    or not public.buzz_is_amount(payload->'budget')
    or jsonb_typeof(payload->'demo') is distinct from 'boolean'
    or jsonb_typeof(payload->'tasks') is distinct from 'array'
    or jsonb_typeof(payload->'transactions') is distinct from 'array'
    or jsonb_typeof(payload->'goals') is distinct from 'array' then return false; end if;
  for item in select value from jsonb_array_elements(payload->'tasks') loop
    if not public.buzz_is_text(item->'id') or not public.buzz_is_text(item->'title')
      or not public.buzz_is_text(item->'category') or not public.buzz_is_date(item->'due')
      or coalesce(item->>'priority', '') not in ('High', 'Medium', 'Low')
      or jsonb_typeof(item->'done') is distinct from 'boolean' then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(payload->'transactions') loop
    if not public.buzz_is_text(item->'id') or not public.buzz_is_text(item->'name')
      or not public.buzz_is_amount(item->'amount', true) or not public.buzz_is_date(item->'date')
      or coalesce(item->>'type', '') not in ('income', 'expense', 'savings')
      or not public.buzz_is_text(item->'category') then return false; end if;
    if item->>'type' = 'savings' then
      if item->>'category' <> 'Savings' or not public.buzz_is_text(item->'goalId')
        or not exists (select 1 from jsonb_array_elements(payload->'goals') g where g->>'id' = item->>'goalId') then return false; end if;
    elsif item ? 'goalId' then return false;
    end if;
  end loop;
  for item in select value from jsonb_array_elements(payload->'goals') loop
    if not public.buzz_is_text(item->'id') or not public.buzz_is_text(item->'name')
      or not public.buzz_is_amount(item->'target', true) or not public.buzz_is_amount(item->'saved')
      or coalesce(item->>'color', '') not in ('peach', 'sage', 'lavender')
      or (item ? 'cover' and coalesce(item->>'cover', '') not in ('journey', 'nest', 'studio', 'horizon')) then return false; end if;
    if (item->>'saved')::numeric + coalesce((select sum((t->>'amount')::numeric) from jsonb_array_elements(payload->'transactions') t where t->>'type' = 'savings' and t->>'goalId' = item->>'id'), 0) > 1000000000000 then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function public.buzz_read_workspace()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); result jsonb;
begin
  if account_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  insert into public.buzz_profiles (user_id) values (account_id) on conflict (user_id) do nothing;
  -- One SELECT gives all collections and the revision from the same snapshot.
  select jsonb_build_object(
    'revision', p.revision, 'updatedAt', p.updated_at,
    'data', jsonb_build_object(
      'version', 2, 'profile', p.profile, 'name', p.display_name, 'budget', p.budget, 'demo', p.demo,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'category', t.category, 'priority', t.priority, 'due', t.due, 'done', t.done) order by t.position) from public.buzz_tasks t where t.user_id = account_id), '[]'::jsonb),
      'transactions', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', t.id, 'name', t.name, 'amount', t.amount, 'type', t.type, 'category', t.category, 'date', t.date, 'goalId', t.goal_id)) order by t.position) from public.buzz_transactions t where t.user_id = account_id), '[]'::jsonb),
      'goals', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', g.id, 'name', g.name, 'target', g.target, 'saved', g.saved, 'color', g.color, 'cover', g.cover)) order by g.position) from public.buzz_goals g where g.user_id = account_id), '[]'::jsonb)
    )
  ) into result from public.buzz_profiles p where p.user_id = account_id;
  return result;
end;
$$;

create or replace function public.buzz_save_workspace(p_expected_revision bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); current_revision bigint;
begin
  if account_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.buzz_validate_workspace(p_data) then raise exception 'Invalid workspace data' using errcode = '22023'; end if;
  select revision into current_revision from public.buzz_profiles where user_id = account_id for update;
  if current_revision is null or p_expected_revision is distinct from current_revision then
    raise exception 'Workspace changed on another device. Reload before saving.' using errcode = '40001';
  end if;
  -- Every collection and the revision commit atomically; failed validation rolls back all writes.
  delete from public.buzz_tasks where user_id = account_id;
  delete from public.buzz_transactions where user_id = account_id;
  delete from public.buzz_goals where user_id = account_id;
  insert into public.buzz_tasks (user_id, id, title, category, priority, due, done, position)
    select account_id, x->>'id', x->>'title', x->>'category', x->>'priority', (x->>'due')::date, (x->>'done')::boolean, ord::integer
    from jsonb_array_elements(p_data->'tasks') with ordinality as entries(x, ord);
  insert into public.buzz_transactions (user_id, id, name, amount, type, category, date, goal_id, position)
    select account_id, x->>'id', x->>'name', (x->>'amount')::bigint, x->>'type', x->>'category', (x->>'date')::date, x->>'goalId', ord::integer
    from jsonb_array_elements(p_data->'transactions') with ordinality as entries(x, ord);
  insert into public.buzz_goals (user_id, id, name, target, saved, color, cover, position)
    select account_id, x->>'id', x->>'name', (x->>'target')::bigint, (x->>'saved')::bigint, x->>'color', x->>'cover', ord::integer
    from jsonb_array_elements(p_data->'goals') with ordinality as entries(x, ord);
  update public.buzz_profiles set profile = p_data->'profile', display_name = p_data->>'name', budget = (p_data->>'budget')::bigint,
    demo = (p_data->>'demo')::boolean, revision = revision + 1, updated_at = now() where user_id = account_id;
  return public.buzz_read_workspace();
end;
$$;

revoke all on function public.buzz_is_text(jsonb), public.buzz_is_amount(jsonb, boolean), public.buzz_is_date(jsonb), public.buzz_validate_workspace(jsonb) from public, anon, authenticated;
revoke all on function public.buzz_read_workspace(), public.buzz_save_workspace(bigint, jsonb) from public, anon;
grant execute on function public.buzz_read_workspace(), public.buzz_save_workspace(bigint, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
