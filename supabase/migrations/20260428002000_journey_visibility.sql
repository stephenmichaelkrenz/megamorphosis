alter table public.journeys
  add column if not exists visibility text not null default 'public';

update public.journeys
set visibility = 'public'
where visibility is null;

alter table public.journeys
  drop constraint if exists journeys_visibility_check;

alter table public.journeys
  add constraint journeys_visibility_check
  check (visibility in ('public', 'unlisted', 'private'));

create index if not exists journeys_visibility_created_at_idx
  on public.journeys (visibility, created_at desc);

drop policy if exists "Journeys are publicly readable" on public.journeys;
create policy "Journeys are readable by visibility"
on public.journeys for select
using (
  visibility in ('public', 'unlisted')
  or auth.uid() = user_id
);

drop policy if exists "Journey updates are publicly readable" on public.journey_updates;
create policy "Journey updates are readable by journey visibility"
on public.journey_updates for select
using (
  exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_updates.journey_id
      and (
        journey.visibility in ('public', 'unlisted')
        or journey.user_id = auth.uid()
      )
  )
);

drop policy if exists "Journey milestones are publicly readable" on public.journey_milestones;
create policy "Journey milestones are readable by journey visibility"
on public.journey_milestones for select
using (
  exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_milestones.journey_id
      and (
        journey.visibility in ('public', 'unlisted')
        or journey.user_id = auth.uid()
      )
  )
);
