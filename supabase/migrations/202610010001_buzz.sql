-- Run this whole file in the Supabase SQL Editor. It adds Buzz-owned objects only.
begin;

create table if not exists public.buzz_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Friend' check (length(btrim(display_name)) between 1 and 300),
  budget bigint not null default 4500000 check (budget between 0 and 1000000000000),
  demo boolean not null default false,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.buzz_tasks (
  user_id uuid not null references public.buzz_profiles(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 300),
  title text not null check (length(btrim(title)) between 1 and 300),
  category text not null check (length(btrim(category)) between 1 and 300),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  due date not null check (due between '1900-01-01' and '9999-12-31'),
  done boolean not null,
  position integer not null,
  primary key (user_id, id)
);
create table if not exists public.buzz_transactions (
  user_id uuid not null references public.buzz_profiles(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 300),
  name text not null check (length(btrim(name)) between 1 and 300),
  amount bigint not null check (amount between 1 and 1000000000000),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  date date not null check (date between '1900-01-01' and '9999-12-31'),
  position integer not null,
  primary key (user_id, id),
  check ((type = 'income' and category in ('Salary', 'Freelance', 'Other'))
    or (type = 'expense' and category in ('Food & drinks', 'Shopping', 'Transport', 'Bills', 'Entertainment', 'Other')))
);
create index if not exists buzz_transactions_month on public.buzz_transactions(user_id, date);
create table if not exists public.buzz_goals (
  user_id uuid not null references public.buzz_profiles(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 300),
  name text not null check (length(btrim(name)) between 1 and 300),
  target bigint not null check (target between 1 and 1000000000000),
  saved bigint not null check (saved between 0 and 1000000000000),
  color text not null check (color in ('peach', 'sage', 'lavender')),
  position integer not null,
  primary key (user_id, id)
);

alter table public.buzz_profiles enable row level security;
alter table public.buzz_tasks enable row level security;
alter table public.buzz_transactions enable row level security;
alter table public.buzz_goals enable row level security;

-- Reads are limited by RLS. Writes use the revision-checked RPC below only.
revoke all on public.buzz_profiles, public.buzz_tasks, public.buzz_transactions, public.buzz_goals from anon, authenticated;
grant select on public.buzz_profiles, public.buzz_tasks, public.buzz_transactions, public.buzz_goals to authenticated;
drop policy if exists buzz_read_own_profile on public.buzz_profiles;
create policy buzz_read_own_profile on public.buzz_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists buzz_read_own_tasks on public.buzz_tasks;
create policy buzz_read_own_tasks on public.buzz_tasks for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists buzz_read_own_transactions on public.buzz_transactions;
create policy buzz_read_own_transactions on public.buzz_transactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists buzz_read_own_goals on public.buzz_goals;
create policy buzz_read_own_goals on public.buzz_goals for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.buzz_is_text(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'string' and length(btrim(value #>> '{}')) between 1 and 300, false);
$$;
create or replace function public.buzz_is_amount(value jsonb, positive boolean default false)
returns boolean language plpgsql immutable set search_path = '' as $$
declare n numeric;
begin
  if value is null or jsonb_typeof(value) <> 'number' then return false; end if;
  n := (value #>> '{}')::numeric;
  return n = trunc(n) and n >= case when positive then 1 else 0 end and n <= 1000000000000;
end;
$$;
create or replace function public.buzz_is_date(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare date_text text;
begin
  if value is null or jsonb_typeof(value) <> 'string' then return false; end if;
  date_text := value #>> '{}';
  return date_text ~ '^\d{4}-\d{2}-\d{2}$' and date_text::date between '1900-01-01' and '9999-12-31'
    and to_char(date_text::date, 'YYYY-MM-DD') = date_text;
exception when others then return false;
end;
$$;

create or replace function public.buzz_validate_workspace(payload jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 2097152
    or payload->'version' is distinct from '1'::jsonb
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
      or coalesce(item->>'type', '') not in ('income', 'expense')
      or not public.buzz_is_text(item->'category') then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(payload->'goals') loop
    if not public.buzz_is_text(item->'id') or not public.buzz_is_text(item->'name')
      or not public.buzz_is_amount(item->'target', true) or not public.buzz_is_amount(item->'saved')
      or coalesce(item->>'color', '') not in ('peach', 'sage', 'lavender') then return false; end if;
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
      'version', 1, 'name', p.display_name, 'budget', p.budget, 'demo', p.demo,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'category', t.category, 'priority', t.priority, 'due', t.due, 'done', t.done) order by t.position) from public.buzz_tasks t where t.user_id = account_id), '[]'::jsonb),
      'transactions', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'amount', t.amount, 'type', t.type, 'category', t.category, 'date', t.date) order by t.position) from public.buzz_transactions t where t.user_id = account_id), '[]'::jsonb),
      'goals', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'target', g.target, 'saved', g.saved, 'color', g.color) order by g.position) from public.buzz_goals g where g.user_id = account_id), '[]'::jsonb)
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
  insert into public.buzz_transactions (user_id, id, name, amount, type, category, date, position)
    select account_id, x->>'id', x->>'name', (x->>'amount')::bigint, x->>'type', x->>'category', (x->>'date')::date, ord::integer
    from jsonb_array_elements(p_data->'transactions') with ordinality as entries(x, ord);
  insert into public.buzz_goals (user_id, id, name, target, saved, color, position)
    select account_id, x->>'id', x->>'name', (x->>'target')::bigint, (x->>'saved')::bigint, x->>'color', ord::integer
    from jsonb_array_elements(p_data->'goals') with ordinality as entries(x, ord);
  update public.buzz_profiles set display_name = p_data->>'name', budget = (p_data->>'budget')::bigint,
    demo = (p_data->>'demo')::boolean, revision = revision + 1, updated_at = now() where user_id = account_id;
  return public.buzz_read_workspace();
end;
$$;

revoke all on function public.buzz_is_text(jsonb), public.buzz_is_amount(jsonb, boolean), public.buzz_is_date(jsonb), public.buzz_validate_workspace(jsonb) from public, anon, authenticated;
revoke all on function public.buzz_read_workspace(), public.buzz_save_workspace(bigint, jsonb) from public, anon;
grant execute on function public.buzz_read_workspace(), public.buzz_save_workspace(bigint, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
