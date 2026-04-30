create table if not exists public.post_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint post_comment_reports_reason_not_blank check (length(btrim(reason)) > 0)
);

create unique index if not exists post_comment_reports_reporter_comment_key
  on public.post_comment_reports (reporter_id, comment_id);

alter table public.post_comment_reports enable row level security;

drop policy if exists "Users can read their own post comment reports" on public.post_comment_reports;
create policy "Users can read their own post comment reports"
on public.post_comment_reports for select
using (auth.uid() = reporter_id);

drop policy if exists "Platform moderators can read post comment reports" on public.post_comment_reports;
create policy "Platform moderators can read post comment reports"
on public.post_comment_reports for select
using (public.is_platform_moderator());

drop policy if exists "Users can report visible post comments" on public.post_comment_reports;
create policy "Users can report visible post comments"
on public.post_comment_reports for insert
with check (
  auth.uid() = reporter_id
  and exists (
    select 1
    from public.post_comments as comment
    where comment.id = post_comment_reports.comment_id
      and comment.deleted_at is null
  )
);

drop policy if exists "Platform moderators can read moderation post comments" on public.post_comments;
create policy "Platform moderators can read moderation post comments"
on public.post_comments for select
using (
  public.is_platform_moderator()
  and (
    hidden_at is not null
    or exists (
      select 1
      from public.post_comment_reports as report
      where report.comment_id = post_comments.id
    )
  )
);
