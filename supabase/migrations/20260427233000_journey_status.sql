alter table public.journeys
  add column if not exists status text not null default 'active';

update public.journeys
set status = 'active'
where status is null;

alter table public.journeys
  drop constraint if exists journeys_status_check;

alter table public.journeys
  add constraint journeys_status_check
  check (status in ('active', 'paused', 'completed'));

create index if not exists journeys_status_created_at_idx
  on public.journeys (status, created_at desc);
