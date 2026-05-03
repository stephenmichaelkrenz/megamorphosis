alter table public.profiles
  add column if not exists email_digest_enabled boolean not null default true;

