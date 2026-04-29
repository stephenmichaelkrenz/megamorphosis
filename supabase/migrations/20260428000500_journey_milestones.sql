create table if not exists public.journey_milestones (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_milestones_title_not_blank check (length(btrim(title)) > 0)
);

create index if not exists journey_milestones_journey_id_created_at_idx
  on public.journey_milestones (journey_id, created_at asc);

create index if not exists journey_milestones_user_id_created_at_idx
  on public.journey_milestones (user_id, created_at desc);

drop trigger if exists journey_milestones_set_updated_at on public.journey_milestones;
create trigger journey_milestones_set_updated_at
before update on public.journey_milestones
for each row execute function public.set_updated_at();

alter table public.journey_milestones enable row level security;

drop policy if exists "Journey milestones are publicly readable" on public.journey_milestones;
create policy "Journey milestones are publicly readable"
on public.journey_milestones for select
using (true);

drop policy if exists "Users can create milestones on their own journeys" on public.journey_milestones;
create policy "Users can create milestones on their own journeys"
on public.journey_milestones for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_milestones.journey_id
      and journey.user_id = auth.uid()
  )
);

drop policy if exists "Users can update milestones on their own journeys" on public.journey_milestones;
create policy "Users can update milestones on their own journeys"
on public.journey_milestones for update
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_milestones.journey_id
      and journey.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_milestones.journey_id
      and journey.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete milestones on their own journeys" on public.journey_milestones;
create policy "Users can delete milestones on their own journeys"
on public.journey_milestones for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = journey_milestones.journey_id
      and journey.user_id = auth.uid()
  )
);
