drop policy if exists "Journey owners can read comments for moderation" on public.journey_update_comments;
create policy "Journey owners can read comments for moderation"
on public.journey_update_comments for select
using (
  deleted_at is null
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_update_comments.journey_id
      and journey.user_id = auth.uid()
  )
);
