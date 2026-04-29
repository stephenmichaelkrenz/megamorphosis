create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  bio text not null default '',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 32),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]+$')
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists onboarded boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  drop column if exists email;

update public.profiles
set username = 'user_' || replace(left(id::text, 8), '-', '_')
where username is null or length(btrim(username)) = 0;

update public.profiles
set username = left(lower(regexp_replace(btrim(username), '[^a-z0-9_]', '_', 'g')), 32);

update public.profiles
set username = 'user_' || replace(left(id::text, 8), '-', '_')
where char_length(username) < 3;

update public.profiles
set
  display_name = coalesce(display_name, ''),
  bio = coalesce(bio, ''),
  onboarded = coalesce(onboarded, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.profiles
  alter column display_name set default '',
  alter column bio set default '',
  alter column onboarded set default false,
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column username set not null,
  alter column display_name set not null,
  alter column bio set not null,
  alter column onboarded set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_length check (char_length(username) between 3 and 32);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format check (username ~ '^[a-z0-9_]+$');
  end if;
end;
$$;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username));

create index if not exists profiles_onboarded_idx
  on public.profiles (onboarded);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

delete from public.follows
where follower_id = following_id;

create unique index if not exists follows_follower_id_following_id_key
  on public.follows (follower_id, following_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'follows_no_self_follow'
      and conrelid = 'public.follows'::regclass
  ) then
    alter table public.follows
      add constraint follows_no_self_follow check (follower_id <> following_id);
  end if;
end;
$$;

create index if not exists follows_following_id_idx
  on public.follows (following_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_content_not_blank check (length(btrim(content)) > 0)
);

alter table public.posts
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_content_not_blank'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_content_not_blank check (length(btrim(content)) > 0);
  end if;
end;
$$;

create index if not exists posts_user_id_created_at_idx
  on public.posts (user_id, created_at desc);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default '',
  goal_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journeys_title_not_blank check (length(btrim(title)) > 0)
);

alter table public.journeys
  add column if not exists category text not null default '',
  add column if not exists goal_text text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.journeys
  alter column category set default '',
  alter column goal_text set default '',
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'journeys_title_not_blank'
      and conrelid = 'public.journeys'::regclass
  ) then
    alter table public.journeys
      add constraint journeys_title_not_blank check (length(btrim(title)) > 0);
  end if;
end;
$$;

create index if not exists journeys_user_id_created_at_idx
  on public.journeys (user_id, created_at desc);

drop trigger if exists journeys_set_updated_at on public.journeys;
create trigger journeys_set_updated_at
before update on public.journeys
for each row execute function public.set_updated_at();

create table if not exists public.journey_updates (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  image_url text,
  metric_value text,
  metric_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_updates_text_not_blank check (length(btrim(text)) > 0)
);

alter table public.journey_updates
  add column if not exists image_url text,
  add column if not exists metric_value text,
  add column if not exists metric_label text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'journey_updates_text_not_blank'
      and conrelid = 'public.journey_updates'::regclass
  ) then
    alter table public.journey_updates
      add constraint journey_updates_text_not_blank check (length(btrim(text)) > 0);
  end if;
end;
$$;

create index if not exists journey_updates_journey_id_created_at_idx
  on public.journey_updates (journey_id, created_at desc);

create index if not exists journey_updates_user_id_created_at_idx
  on public.journey_updates (user_id, created_at desc);

drop trigger if exists journey_updates_set_updated_at on public.journey_updates;
create trigger journey_updates_set_updated_at
before update on public.journey_updates
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_updates enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Follows are publicly readable" on public.follows;
create policy "Follows are publicly readable"
on public.follows for select
using (true);

drop policy if exists "Users can follow from their own account" on public.follows;
create policy "Users can follow from their own account"
on public.follows for insert
with check (auth.uid() = follower_id and follower_id <> following_id);

drop policy if exists "Users can unfollow from their own account" on public.follows;
create policy "Users can unfollow from their own account"
on public.follows for delete
using (auth.uid() = follower_id);

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Posts are publicly readable"
on public.posts for select
using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
on public.posts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
on public.posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
on public.posts for delete
using (auth.uid() = user_id);

drop policy if exists "Journeys are publicly readable" on public.journeys;
create policy "Journeys are publicly readable"
on public.journeys for select
using (true);

drop policy if exists "Users can create their own journeys" on public.journeys;
create policy "Users can create their own journeys"
on public.journeys for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own journeys" on public.journeys;
create policy "Users can update their own journeys"
on public.journeys for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own journeys" on public.journeys;
create policy "Users can delete their own journeys"
on public.journeys for delete
using (auth.uid() = user_id);

drop policy if exists "Journey updates are publicly readable" on public.journey_updates;
create policy "Journey updates are publicly readable"
on public.journey_updates for select
using (true);

drop policy if exists "Users can create updates on their own journeys" on public.journey_updates;
create policy "Users can create updates on their own journeys"
on public.journey_updates for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_updates.journey_id
      and journey.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their own journey updates" on public.journey_updates;
create policy "Users can update their own journey updates"
on public.journey_updates for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_updates.journey_id
      and journey.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete their own journey updates" on public.journey_updates;
create policy "Users can delete their own journey updates"
on public.journey_updates for delete
using (auth.uid() = user_id);
