create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create table if not exists public.journey_update_comments (
  id uuid primary key default gen_random_uuid(),
  journey_update_id uuid not null references public.journey_updates(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_update_comments_body_not_blank check (length(btrim(body)) > 0)
);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.journey_update_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint comment_reports_reason_not_blank check (length(btrim(reason)) > 0)
);

create unique index if not exists comment_reports_reporter_comment_key
  on public.comment_reports (reporter_id, comment_id);

create index if not exists journey_update_comments_update_created_at_idx
  on public.journey_update_comments (journey_update_id, created_at asc);

create index if not exists journey_update_comments_journey_created_at_idx
  on public.journey_update_comments (journey_id, created_at asc);

create index if not exists journey_update_comments_user_created_at_idx
  on public.journey_update_comments (user_id, created_at desc);

drop trigger if exists journey_update_comments_set_updated_at on public.journey_update_comments;
create trigger journey_update_comments_set_updated_at
before update on public.journey_update_comments
for each row execute function public.set_updated_at();

alter table public.user_blocks enable row level security;
alter table public.journey_update_comments enable row level security;
alter table public.comment_reports enable row level security;

drop policy if exists "Users can read their own blocks" on public.user_blocks;
create policy "Users can read their own blocks"
on public.user_blocks for select
using (auth.uid() = blocker_id);

drop policy if exists "Users can create their own blocks" on public.user_blocks;
create policy "Users can create their own blocks"
on public.user_blocks for insert
with check (auth.uid() = blocker_id);

drop policy if exists "Users can remove their own blocks" on public.user_blocks;
create policy "Users can remove their own blocks"
on public.user_blocks for delete
using (auth.uid() = blocker_id);

drop policy if exists "Readable journey update comments" on public.journey_update_comments;
create policy "Readable journey update comments"
on public.journey_update_comments for select
using (
  deleted_at is null
  and (
    hidden_at is null
    or auth.uid() = user_id
    or exists (
      select 1
      from public.journeys as journey
      where journey.id = journey_update_comments.journey_id
        and journey.user_id = auth.uid()
    )
  )
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_update_comments.journey_id
      and (
        (
          journey.visibility in ('public', 'unlisted')
          and journey.archived_at is null
        )
        or journey.user_id = auth.uid()
      )
  )
  and not exists (
    select 1
    from public.user_blocks as block
    where (
      block.blocker_id = auth.uid()
      and block.blocked_id = journey_update_comments.user_id
    )
    or (
      block.blocker_id = journey_update_comments.user_id
      and block.blocked_id = auth.uid()
    )
  )
);

drop policy if exists "Users can create comments on readable journeys" on public.journey_update_comments;
create policy "Users can create comments on readable journeys"
on public.journey_update_comments for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journey_updates as update
    join public.journeys as journey on journey.id = update.journey_id
    where update.id = journey_update_comments.journey_update_id
      and update.journey_id = journey_update_comments.journey_id
      and (
        (
          journey.visibility in ('public', 'unlisted')
          and journey.archived_at is null
        )
        or journey.user_id = auth.uid()
      )
      and not exists (
        select 1
        from public.user_blocks as block
        where (
          block.blocker_id = journey.user_id
          and block.blocked_id = auth.uid()
        )
        or (
          block.blocker_id = auth.uid()
          and block.blocked_id = journey.user_id
        )
      )
  )
);

drop policy if exists "Users can moderate own or journey comments" on public.journey_update_comments;
create policy "Users can moderate own or journey comments"
on public.journey_update_comments for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_update_comments.journey_id
      and journey.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_update_comments.journey_id
      and journey.user_id = auth.uid()
  )
);

drop policy if exists "Users can read their own comment reports" on public.comment_reports;
create policy "Users can read their own comment reports"
on public.comment_reports for select
using (auth.uid() = reporter_id);

drop policy if exists "Users can report visible comments" on public.comment_reports;
create policy "Users can report visible comments"
on public.comment_reports for insert
with check (
  auth.uid() = reporter_id
  and exists (
    select 1
    from public.journey_update_comments as comment
    where comment.id = comment_reports.comment_id
      and comment.deleted_at is null
  )
);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'respect', 'comment'));

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (target_type in ('profile', 'post', 'journey_update', 'comment'));

create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select journey.user_id into owner_id
  from public.journeys as journey
  where journey.id = new.journey_id;

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
      'comment',
      'comment',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists comments_create_notification on public.journey_update_comments;
create trigger comments_create_notification
after insert on public.journey_update_comments
for each row execute function public.create_comment_notification();
