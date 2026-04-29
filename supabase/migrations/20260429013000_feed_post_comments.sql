create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_comments_body_not_blank check (length(btrim(body)) > 0)
);

create index if not exists post_comments_post_created_at_idx
  on public.post_comments (post_id, created_at asc);

create index if not exists post_comments_user_created_at_idx
  on public.post_comments (user_id, created_at desc);

drop trigger if exists post_comments_set_updated_at on public.post_comments;
create trigger post_comments_set_updated_at
before update on public.post_comments
for each row execute function public.set_updated_at();

alter table public.post_comments enable row level security;

drop policy if exists "Readable post comments" on public.post_comments;
create policy "Readable post comments"
on public.post_comments for select
using (
  deleted_at is null
  and (
    hidden_at is null
    or auth.uid() = user_id
    or exists (
      select 1
      from public.posts as post
      where post.id = post_comments.post_id
        and post.user_id = auth.uid()
    )
  )
  and exists (
    select 1
    from public.posts as post
    where post.id = post_comments.post_id
  )
  and not exists (
    select 1
    from public.user_blocks as block
    where (
      block.blocker_id = auth.uid()
      and block.blocked_id = post_comments.user_id
    )
    or (
      block.blocker_id = post_comments.user_id
      and block.blocked_id = auth.uid()
    )
  )
);

drop policy if exists "Users can create comments on readable posts" on public.post_comments;
create policy "Users can create comments on readable posts"
on public.post_comments for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.posts as post
    where post.id = post_comments.post_id
      and not exists (
        select 1
        from public.user_blocks as block
        where (
          block.blocker_id = post.user_id
          and block.blocked_id = auth.uid()
        )
        or (
          block.blocker_id = auth.uid()
          and block.blocked_id = post.user_id
        )
      )
  )
);

drop policy if exists "Users can moderate own or post comments" on public.post_comments;
create policy "Users can moderate own or post comments"
on public.post_comments for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.posts as post
    where post.id = post_comments.post_id
      and post.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.posts as post
    where post.id = post_comments.post_id
      and post.user_id = auth.uid()
  )
);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'respect', 'comment', 'circle_checkin', 'direct_message'));

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (target_type in ('profile', 'post', 'journey_update', 'comment', 'circle_checkin', 'direct_message', 'post_comment'));

create or replace function public.create_post_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select post.user_id into owner_id
  from public.posts as post
  where post.id = new.post_id;

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
      'post_comment',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists post_comments_create_notification on public.post_comments;
create trigger post_comments_create_notification
after insert on public.post_comments
for each row execute function public.create_post_comment_notification();

create or replace function public.prevent_post_comment_moderation_edits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_post_owner boolean;
  is_moderator boolean;
begin
  select exists (
    select 1
    from public.posts as post
    where post.id = old.post_id
      and post.user_id = auth.uid()
  ) into is_post_owner;

  is_moderator := public.is_platform_moderator();

  if new.post_id <> old.post_id
    or new.user_id <> old.user_id
    or new.body <> old.body
    or new.created_at <> old.created_at then
    raise exception 'Comments cannot be rewritten.';
  end if;

  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Deleted comments cannot be restored or changed.';
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    if auth.uid() <> old.user_id and not is_post_owner and not is_moderator then
      raise exception 'Only the comment author or a moderator can delete comments.';
    end if;

    if new.deleted_at < old.created_at then
      raise exception 'Comment deletion cannot predate the comment.';
    end if;
  end if;

  if new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by then
    if not is_post_owner and not is_moderator then
      raise exception 'Only post owners or platform moderators can hide comments.';
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

drop trigger if exists post_comments_prevent_rewrites on public.post_comments;
create trigger post_comments_prevent_rewrites
before update on public.post_comments
for each row execute function public.prevent_post_comment_moderation_edits();
