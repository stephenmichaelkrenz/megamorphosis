alter table public.circles
  add column if not exists checkin_prompt text not null
  default 'What is one move you are making today?';

alter table public.circles
  drop constraint if exists circles_checkin_prompt_not_blank;

alter table public.circles
  add constraint circles_checkin_prompt_not_blank
  check (length(btrim(checkin_prompt)) > 0);

update public.circles
set checkin_prompt = 'What fitness move did you make today?'
where slug = 'fitness-reset'
  and checkin_prompt = 'What is one move you are making today?';

update public.circles
set checkin_prompt = 'What career move did you make today?'
where slug = 'career-reinvention'
  and checkin_prompt = 'What is one move you are making today?';

update public.circles
set checkin_prompt = 'What creative practice did you keep today?'
where slug = 'creative-discipline'
  and checkin_prompt = 'What is one move you are making today?';

update public.circles
set checkin_prompt = 'What inner work did you practice today?'
where slug = 'inner-work'
  and checkin_prompt = 'What is one move you are making today?';
