drop policy if exists "Journey owners can read reports on their comments" on public.comment_reports;
create policy "Journey owners can read reports on their comments"
on public.comment_reports for select
using (
  exists (
    select 1
    from public.journey_update_comments as comment
    join public.journeys as journey on journey.id = comment.journey_id
    where comment.id = comment_reports.comment_id
      and journey.user_id = auth.uid()
  )
);
