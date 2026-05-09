alter table public.respects
  add column if not exists reaction_type text not null default 'respect';

alter table public.respects
  drop constraint if exists respects_reaction_type_check;

alter table public.respects
  add constraint respects_reaction_type_check
  check (reaction_type in ('respect', 'inspired', 'same', 'keep_going'));

drop index if exists respects_user_target_key;

create unique index if not exists respects_user_target_reaction_key
  on public.respects (user_id, target_type, target_id, reaction_type);
