create table if not exists public.respects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint respects_target_type_check check (
    target_type in ('post', 'journey_update')
  )
);

create unique index if not exists respects_user_target_key
  on public.respects (user_id, target_type, target_id);

create index if not exists respects_target_idx
  on public.respects (target_type, target_id);

alter table public.respects enable row level security;

drop policy if exists "Respects are publicly readable" on public.respects;
create policy "Respects are publicly readable"
on public.respects for select
using (true);

drop policy if exists "Users can create their own respects" on public.respects;
create policy "Users can create their own respects"
on public.respects for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own respects" on public.respects;
create policy "Users can remove their own respects"
on public.respects for delete
using (auth.uid() = user_id);
