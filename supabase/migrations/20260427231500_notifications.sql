create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('follow', 'respect')),
  target_type text not null check (target_type in ('profile', 'post', 'journey_update')),
  target_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_id_created_at_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_id_read_at_idx
  on public.notifications (recipient_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
on public.notifications for select
using (auth.uid() = recipient_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
on public.notifications for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
on public.notifications for delete
using (auth.uid() = recipient_id);

create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      target_type,
      target_id
    )
    values (
      new.following_id,
      new.follower_id,
      'follow',
      'profile',
      new.follower_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists follows_create_notification on public.follows;
create trigger follows_create_notification
after insert on public.follows
for each row execute function public.create_follow_notification();

create or replace function public.create_respect_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if new.target_type = 'post' then
    select posts.user_id into owner_id
    from public.posts
    where posts.id = new.target_id;
  elsif new.target_type = 'journey_update' then
    select journey_updates.user_id into owner_id
    from public.journey_updates
    where journey_updates.id = new.target_id;
  end if;

  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      target_type,
      target_id
    )
    values (
      owner_id,
      new.user_id,
      'respect',
      new.target_type,
      new.target_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists respects_create_notification on public.respects;
create trigger respects_create_notification
after insert on public.respects
for each row execute function public.create_respect_notification();
