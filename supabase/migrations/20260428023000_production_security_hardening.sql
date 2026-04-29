create table if not exists public.platform_moderators (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator',
  created_at timestamptz not null default now(),
  constraint platform_moderators_role_check check (role in ('owner', 'moderator'))
);

alter table public.platform_moderators enable row level security;

insert into public.platform_moderators (user_id, role)
select id, 'owner'
from public.profiles
where username = 'stephen'
on conflict (user_id) do nothing;

create or replace function public.is_platform_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_moderators
    where user_id = auth.uid()
  );
$$;

drop policy if exists "Platform moderators can read own role" on public.platform_moderators;
create policy "Platform moderators can read own role"
on public.platform_moderators for select
using (auth.uid() = user_id);

drop policy if exists "Platform moderators can read reports" on public.comment_reports;
create policy "Platform moderators can read reports"
on public.comment_reports for select
using (public.is_platform_moderator());

drop policy if exists "Platform moderators can read moderation comments" on public.journey_update_comments;
create policy "Platform moderators can read moderation comments"
on public.journey_update_comments for select
using (
  public.is_platform_moderator()
  and (
    hidden_at is not null
    or exists (
      select 1
      from public.comment_reports as report
      where report.comment_id = journey_update_comments.id
    )
  )
);

drop policy if exists "Platform moderators can hide comments" on public.journey_update_comments;
create policy "Platform moderators can hide comments"
on public.journey_update_comments for update
using (public.is_platform_moderator())
with check (public.is_platform_moderator());

drop policy if exists "Platform moderators can read blocks" on public.user_blocks;
create policy "Platform moderators can read blocks"
on public.user_blocks for select
using (public.is_platform_moderator());

create or replace function public.prevent_comment_moderation_edits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_journey_owner boolean;
  is_moderator boolean;
begin
  select exists (
    select 1
    from public.journeys as journey
    where journey.id = old.journey_id
      and journey.user_id = auth.uid()
  ) into is_journey_owner;

  is_moderator := public.is_platform_moderator();

  if new.journey_update_id <> old.journey_update_id
    or new.journey_id <> old.journey_id
    or new.user_id <> old.user_id
    or new.body <> old.body
    or new.created_at <> old.created_at then
    raise exception 'Comments cannot be rewritten.';
  end if;

  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Deleted comments cannot be restored or changed.';
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    if auth.uid() <> old.user_id and not is_journey_owner and not is_moderator then
      raise exception 'Only the comment author or a moderator can delete comments.';
    end if;

    if new.deleted_at < old.created_at then
      raise exception 'Comment deletion cannot predate the comment.';
    end if;
  end if;

  if new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by then
    if not is_journey_owner and not is_moderator then
      raise exception 'Only journey owners or platform moderators can hide comments.';
    end if;

    if new.hidden_at is null and new.hidden_by is not null then
      raise exception 'Visible comments cannot keep a hidden_by value.';
    end if;

    if new.hidden_at is not null and new.hidden_by is distinct from auth.uid() then
      raise exception 'hidden_by must match the moderator.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists journey_update_comments_prevent_rewrites on public.journey_update_comments;
create trigger journey_update_comments_prevent_rewrites
before update on public.journey_update_comments
for each row execute function public.prevent_comment_moderation_edits();

create or replace function public.prevent_direct_message_edits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sender_id <> old.sender_id
    or new.recipient_id <> old.recipient_id
    or new.body <> old.body
    or new.created_at <> old.created_at then
    raise exception 'Direct messages cannot be edited.';
  end if;

  if old.read_at is not null and new.read_at is distinct from old.read_at then
    raise exception 'Direct message read receipts cannot be changed.';
  end if;

  if old.read_at is null and new.read_at is not null and new.read_at < old.created_at then
    raise exception 'Direct message read receipt cannot predate the message.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_notification_edits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.recipient_id <> old.recipient_id
    or new.actor_id is distinct from old.actor_id
    or new.type <> old.type
    or new.target_type <> old.target_type
    or new.target_id <> old.target_id
    or new.created_at <> old.created_at then
    raise exception 'Notifications cannot be edited.';
  end if;

  if old.read_at is not null and new.read_at is distinct from old.read_at then
    raise exception 'Notification read receipts cannot be changed.';
  end if;

  if old.read_at is null and new.read_at is not null and new.read_at < old.created_at then
    raise exception 'Notification read receipt cannot predate the notification.';
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_prevent_edits on public.notifications;
create trigger notifications_prevent_edits
before update on public.notifications
for each row execute function public.prevent_notification_edits();
