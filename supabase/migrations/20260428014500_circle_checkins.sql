create table if not exists public.circle_checkins (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null default 'What is one move you are making today?',
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circle_checkins_prompt_not_blank check (length(btrim(prompt)) > 0),
  constraint circle_checkins_body_not_blank check (length(btrim(body)) > 0)
);

create index if not exists circle_checkins_circle_created_at_idx
  on public.circle_checkins (circle_id, created_at desc);

create index if not exists circle_checkins_user_created_at_idx
  on public.circle_checkins (user_id, created_at desc);

drop trigger if exists circle_checkins_set_updated_at on public.circle_checkins;
create trigger circle_checkins_set_updated_at
before update on public.circle_checkins
for each row execute function public.set_updated_at();

alter table public.circle_checkins enable row level security;

drop policy if exists "Readable circle check-ins" on public.circle_checkins;
create policy "Readable circle check-ins"
on public.circle_checkins for select
using (
  deleted_at is null
  and exists (
    select 1
    from public.circles as circle
    where circle.id = circle_checkins.circle_id
      and circle.is_public = true
  )
  and not exists (
    select 1
    from public.user_blocks as block
    where (
      block.blocker_id = auth.uid()
      and block.blocked_id = circle_checkins.user_id
    )
    or (
      block.blocker_id = circle_checkins.user_id
      and block.blocked_id = auth.uid()
    )
  )
);

drop policy if exists "Circle members can create check-ins" on public.circle_checkins;
create policy "Circle members can create check-ins"
on public.circle_checkins for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.circles as circle
    where circle.id = circle_checkins.circle_id
      and circle.is_public = true
  )
  and exists (
    select 1
    from public.circle_members as member
    where member.circle_id = circle_checkins.circle_id
      and member.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own check-ins" on public.circle_checkins;
create policy "Users can update own check-ins"
on public.circle_checkins for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
