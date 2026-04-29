alter table public.journey_updates
  add column if not exists reflection text,
  add column if not exists mood text,
  add column if not exists next_step text;

alter table public.journey_updates
  drop constraint if exists journey_updates_mood_check;

alter table public.journey_updates
  add constraint journey_updates_mood_check
  check (
    mood is null
    or mood in ('energized', 'steady', 'challenged', 'stuck', 'proud')
  );
