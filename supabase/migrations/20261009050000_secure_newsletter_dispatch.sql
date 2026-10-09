create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.newsletter_dispatch_config (
  singleton boolean primary key default true check (singleton),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);
alter table private.newsletter_dispatch_config enable row level security;
revoke all on private.newsletter_dispatch_config from public, anon, authenticated;

create or replace function public.ft_newsletter_list_active(p_secret text)
returns table(id bigint, email text)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if p_secret is null or not exists (
    select 1
    from private.newsletter_dispatch_config c
    where c.singleton
      and c.secret_hash = encode(extensions.digest(convert_to(p_secret, 'UTF8'), 'sha256'), 'hex')
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return query
    select s.id, s.email
    from public.newsletter_subscribers s
    where s.status = 'subscribed'
      and s.unsubscribed_at is null
      and nullif(btrim(s.email), '') is not null
    order by s.id;
end;
$function$;

create or replace function public.ft_newsletter_reconcile_unsubscribed(p_secret text, p_emails text[])
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  changed integer := 0;
begin
  if p_secret is null or not exists (
    select 1
    from private.newsletter_dispatch_config c
    where c.singleton
      and c.secret_hash = encode(extensions.digest(convert_to(p_secret, 'UTF8'), 'sha256'), 'hex')
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  update public.newsletter_subscribers s
  set status = 'unsubscribed',
      unsubscribed_at = coalesce(s.unsubscribed_at, now()),
      updated_at = now()
  where s.status = 'subscribed'
    and s.unsubscribed_at is null
    and lower(btrim(s.email)) = any (
      select lower(btrim(x))
      from unnest(coalesce(p_emails, array[]::text[])) as t(x)
      where nullif(btrim(x), '') is not null
    );

  get diagnostics changed = row_count;
  return changed;
end;
$function$;

create or replace function public.ft_newsletter_mark_unsubscribed(p_secret text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  changed integer := 0;
begin
  if p_secret is null or not exists (
    select 1
    from private.newsletter_dispatch_config c
    where c.singleton
      and c.secret_hash = encode(extensions.digest(convert_to(p_secret, 'UTF8'), 'sha256'), 'hex')
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  update public.newsletter_subscribers s
  set status = 'unsubscribed',
      unsubscribed_at = coalesce(s.unsubscribed_at, now()),
      updated_at = now()
  where lower(btrim(s.email)) = lower(btrim(p_email))
    and (s.status <> 'unsubscribed' or s.unsubscribed_at is null);

  get diagnostics changed = row_count;
  return changed > 0;
end;
$function$;

create or replace function public.ft_newsletter_signup(p_email text, p_consent_text text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  previous_status text;
  previous_unsubscribed_at timestamptz;
  should_welcome boolean := false;
  was_resubscribed boolean := false;
begin
  if length(normalized_email) > 254
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Valid email required' using errcode = '22023';
  end if;

  if p_consent_text is distinct from 'Yes, send me Football Talk news, community updates, competitions and occasional partner content by email. I can unsubscribe at any time.' then
    raise exception 'Newsletter consent is required' using errcode = '42501';
  end if;

  select s.status, s.unsubscribed_at
    into previous_status, previous_unsubscribed_at
  from public.newsletter_subscribers s
  where lower(s.email) = normalized_email
  for update;

  if not found then
    insert into public.newsletter_subscribers
      (email, status, source, consent_text, consented_at, unsubscribed_at)
    values
      (normalized_email, 'subscribed', 'website', p_consent_text, now(), null);
    should_welcome := true;
  elsif previous_status is distinct from 'subscribed' or previous_unsubscribed_at is not null then
    update public.newsletter_subscribers
    set status = 'subscribed',
        source = 'website',
        consent_text = p_consent_text,
        consented_at = now(),
        unsubscribed_at = null,
        updated_at = now()
    where lower(email) = normalized_email;
    should_welcome := true;
    was_resubscribed := true;
  end if;

  return jsonb_build_object(
    'welcome', should_welcome,
    'resubscribed', was_resubscribed,
    'status', 'subscribed'
  );
end;
$function$;

revoke all on function public.ft_newsletter_list_active(text) from public;
revoke all on function public.ft_newsletter_reconcile_unsubscribed(text, text[]) from public;
revoke all on function public.ft_newsletter_mark_unsubscribed(text, text) from public;
revoke all on function public.ft_newsletter_signup(text, text) from public;
grant execute on function public.ft_newsletter_list_active(text) to anon;
grant execute on function public.ft_newsletter_reconcile_unsubscribed(text, text[]) to anon;
grant execute on function public.ft_newsletter_mark_unsubscribed(text, text) to anon;
grant execute on function public.ft_newsletter_signup(text, text) to anon, authenticated;

notify pgrst, 'reload schema';