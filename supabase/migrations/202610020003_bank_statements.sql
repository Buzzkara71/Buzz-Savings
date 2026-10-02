-- Run after 202610020002_custom_photos.sql. Preserves all existing workspace data.
-- Imported statements use exact integer hundredths of IDR and their own ledger.
begin;

create or replace function public.buzz_is_statement(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; field text; balance numeric; previous_date text; amount numeric; incoming numeric := 0; outgoing numeric := 0;
begin
  if value is null or value = 'null'::jsonb then return true; end if;
  if jsonb_typeof(value) <> 'object' or value->>'format' is distinct from 'buzz-bank-statement'
    or value->'version' is distinct from '1'::jsonb or not public.buzz_is_text(value->'id')
    or not public.buzz_is_text(value->'account') or not public.buzz_is_text(value->'sourceFile')
    or not public.buzz_is_date(value->'from') or not public.buzz_is_date(value->'to')
    or value->>'from' > value->>'to' or jsonb_typeof(value->'transactions') is distinct from 'array'
    or octet_length(value::text) > 2097152 then return false; end if;
  if jsonb_array_length(value->'transactions') not between 1 and 10000 then return false; end if;
  foreach field in array array['openingCents','closingCents'] loop
    if jsonb_typeof(value->field) is distinct from 'number' then return false; end if;
    amount := (value->>field)::numeric;
    if amount <> trunc(amount) or abs(amount) > 100000000000000 then return false; end if;
  end loop;
  balance := (value->>'openingCents')::numeric;
  previous_date := value->>'from';
  for item in select x from jsonb_array_elements(value->'transactions') as rows(x) loop
    if not public.buzz_is_text(item->'id') or not public.buzz_is_text(item->'source')
      or not public.buzz_is_text(item->'description') or not public.buzz_is_date(item->'date')
      or item->>'date' < previous_date or item->>'date' > value->>'to'
      or jsonb_typeof(item->'time') is distinct from 'string' or item->>'time' !~ '^(?:[01][0-9]|2[0-3])[.][0-5][0-9]$'
      or jsonb_typeof(item->'note') is distinct from 'string' or length(item->>'note') > 1000
      or jsonb_typeof(item->'reason') is distinct from 'string' or length(btrim(item->>'reason')) not between 1 and 1000
      or jsonb_typeof(item->'review') is distinct from 'boolean'
      or coalesce(item->>'kind','') not in ('income','expense','transfer','savings','loan','review')
      or coalesce(item->>'category','') not in ('Food & drinks','Shopping','Transport','Bills','Entertainment','Other','Salary','Freelance','Interest','Bank fees & tax','Own-account transfer','Pocket transfer','Investment transfer','Savings','Loan proceeds','Loan repayment')
      or jsonb_typeof(item->'page') is distinct from 'number' then return false; end if;
    amount := (item->>'page')::numeric;
    if amount <> trunc(amount) or amount not between 1 and 10000 then return false; end if;
    foreach field in array array['amountCents','balanceCents'] loop
      if jsonb_typeof(item->field) is distinct from 'number' then return false; end if;
      amount := (item->>field)::numeric;
      if amount <> trunc(amount) or abs(amount) > 100000000000000 then return false; end if;
    end loop;
    amount := (item->>'amountCents')::numeric;
    if amount = 0 or (item->>'kind' = 'income' and amount < 0) or (item->>'kind' = 'expense' and amount > 0)
      or (item->>'kind' = 'review' and item->'review' <> 'true'::jsonb) then return false; end if;
    balance := balance + amount;
    incoming := incoming + greatest(amount, 0);
    outgoing := outgoing + greatest(-amount, 0);
    if incoming > 9007199254740991 or outgoing > 9007199254740991 then return false; end if;
    if balance <> (item->>'balanceCents')::numeric then return false; end if;
    previous_date := item->>'date';
  end loop;
  if exists (select 1 from jsonb_array_elements(value->'transactions') as rows(x) group by x->>'id' having count(*) > 1) then return false; end if;
  return balance = (value->>'closingCents')::numeric;
exception when others then return false;
end;
$$;
revoke all on function public.buzz_is_statement(jsonb) from public, anon, authenticated;

alter table public.buzz_profiles add column if not exists bank_statement jsonb;
alter table public.buzz_profiles drop constraint if exists buzz_bank_statement_check;
alter table public.buzz_profiles add constraint buzz_bank_statement_check check (public.buzz_is_statement(bank_statement));

create or replace function public.buzz_validate_workspace(payload jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text) > 2097152
    or payload->'version' is distinct from '2'::jsonb
    or not public.buzz_is_statement(payload->'bankStatement')
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
      or not public.buzz_is_photo(item->'photo')
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
    'revision', p.revision, 'updatedAt', p.updated_at, 'supportsPhotos', true, 'supportsBankStatements', true,
    'data', jsonb_build_object(
      'version', 2, 'bankStatement', p.bank_statement, 'profile', p.profile, 'name', p.display_name, 'budget', p.budget, 'demo', p.demo,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'category', t.category, 'priority', t.priority, 'due', t.due, 'done', t.done) order by t.position) from public.buzz_tasks t where t.user_id = account_id), '[]'::jsonb),
      'transactions', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', t.id, 'name', t.name, 'amount', t.amount, 'type', t.type, 'category', t.category, 'date', t.date, 'goalId', t.goal_id)) order by t.position) from public.buzz_transactions t where t.user_id = account_id), '[]'::jsonb),
      'goals', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', g.id, 'name', g.name, 'target', g.target, 'saved', g.saved, 'color', g.color, 'cover', g.cover, 'photo', g.photo)) order by g.position) from public.buzz_goals g where g.user_id = account_id), '[]'::jsonb)
    )
  ) into result from public.buzz_profiles p where p.user_id = account_id;
  return result;
end;
$$;

create or replace function public.buzz_save_workspace(p_expected_revision bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); current_revision bigint; previous_photos jsonb; previous_profile_photo jsonb;
begin
  if account_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.buzz_validate_workspace(p_data) then raise exception 'Invalid workspace data' using errcode = '22023'; end if;
  select revision, profile->'photo' into current_revision, previous_profile_photo from public.buzz_profiles where user_id = account_id for update;
  if current_revision is null or p_expected_revision is distinct from current_revision then
    raise exception 'Workspace changed on another device. Reload before saving.' using errcode = '40001';
  end if;
  -- Preserve photos omitted by older clients; explicit JSON null removes a photo.
  select coalesce(jsonb_object_agg(id, photo), '{}'::jsonb) into previous_photos from public.buzz_goals where user_id = account_id;
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
  insert into public.buzz_goals (user_id, id, name, target, saved, color, cover, photo, position)
    select account_id, x->>'id', x->>'name', (x->>'target')::bigint, (x->>'saved')::bigint, x->>'color', x->>'cover', case when x ? 'photo' then x->>'photo' else previous_photos->>(x->>'id') end, ord::integer
    from jsonb_array_elements(p_data->'goals') with ordinality as entries(x, ord);
  -- Omitted statements from older clients are preserved; explicit null removes one.
  update public.buzz_profiles set bank_statement = case when p_data ? 'bankStatement' then nullif(p_data->'bankStatement', 'null'::jsonb) else bank_statement end, profile = jsonb_strip_nulls((p_data->'profile') || case when (p_data->'profile') ? 'photo' then '{}'::jsonb else jsonb_build_object('photo', previous_profile_photo) end), display_name = p_data->>'name', budget = (p_data->>'budget')::bigint,
    demo = (p_data->>'demo')::boolean, revision = revision + 1, updated_at = now() where user_id = account_id;
  return public.buzz_read_workspace();
end;
$$;

revoke all on function public.buzz_is_text(jsonb), public.buzz_is_amount(jsonb, boolean), public.buzz_is_date(jsonb), public.buzz_validate_workspace(jsonb) from public, anon, authenticated;
revoke all on function public.buzz_read_workspace(), public.buzz_save_workspace(bigint, jsonb) from public, anon;
grant execute on function public.buzz_read_workspace(), public.buzz_save_workspace(bigint, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
