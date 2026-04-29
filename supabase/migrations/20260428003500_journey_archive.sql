alter table public.journeys
  add column if not exists archived_at timestamptz;

create index if not exists journeys_user_id_archived_at_idx
  on public.journeys (user_id, archived_at, created_at desc);

create index if not exists journeys_visibility_archived_at_idx
  on public.journeys (visibility, archived_at, created_at desc);

drop policy if exists "Journeys are publicly readable" on public.journeys;
drop policy if exists "Journeys are readable by visibility" on public.journeys;
create policy "Journeys are readable by visibility"
on public.journeys for select
using (
  (
    visibility in ('public', 'unlisted')
    and archived_at is null
  )
  or auth.uid() = user_id
);

drop policy if exists "Journey updates are publicly readable" on public.journey_updates;
drop policy if exists "Journey updates are readable by journey visibility" on public.journey_updates;
create policy "Journey updates are readable by journey visibility"
on public.journey_updates for select
using (
  exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_updates.journey_id
      and (
        (
          journey.visibility in ('public', 'unlisted')
          and journey.archived_at is null
        )
        or journey.user_id = auth.uid()
      )
  )
);

drop policy if exists "Journey milestones are publicly readable" on public.journey_milestones;
drop policy if exists "Journey milestones are readable by journey visibility" on public.journey_milestones;
create policy "Journey milestones are readable by journey visibility"
on public.journey_milestones for select
using (
  exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_milestones.journey_id
      and (
        (
          journey.visibility in ('public', 'unlisted')
          and journey.archived_at is null
        )
        or journey.user_id = auth.uid()
      )
  )
);
