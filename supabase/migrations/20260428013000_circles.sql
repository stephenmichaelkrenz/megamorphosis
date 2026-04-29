create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  category text not null default '',
  is_public boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circles_name_not_blank check (length(btrim(name)) > 0),
  constraint circles_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

create unique index if not exists circles_slug_key
  on public.circles (lower(slug));

create index if not exists circles_public_created_at_idx
  on public.circles (is_public, created_at desc);

drop trigger if exists circles_set_updated_at on public.circles;
create trigger circles_set_updated_at
before update on public.circles
for each row execute function public.set_updated_at();

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id),
  constraint circle_members_role_check check (role in ('owner', 'moderator', 'member'))
);

create index if not exists circle_members_user_id_idx
  on public.circle_members (user_id);

create table if not exists public.circle_journeys (
  circle_id uuid not null references public.circles(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_id, journey_id)
);

create index if not exists circle_journeys_journey_id_idx
  on public.circle_journeys (journey_id);

insert into public.circles (name, slug, description, category)
values
  (
    'Fitness Reset',
    'fitness-reset',
    'Training, nutrition, recovery, and body recomposition journeys.',
    'Health'
  ),
  (
    'Career Reinvention',
    'career-reinvention',
    'Skill-building, job changes, business experiments, and professional pivots.',
    'Work'
  ),
  (
    'Creative Discipline',
    'creative-discipline',
    'Writing, music, design, art, and daily creative practice.',
    'Creativity'
  ),
  (
    'Inner Work',
    'inner-work',
    'Emotional growth, mindfulness, faith, healing, and identity change.',
    'Life'
  )
on conflict do nothing;

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_journeys enable row level security;

drop policy if exists "Public circles are readable" on public.circles;
create policy "Public circles are readable"
on public.circles for select
using (is_public = true or created_by = auth.uid());

drop policy if exists "Authenticated users can create circles" on public.circles;
create policy "Authenticated users can create circles"
on public.circles for insert
with check (auth.uid() = created_by);

drop policy if exists "Circle creators can update circles" on public.circles;
create policy "Circle creators can update circles"
on public.circles for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Circle memberships are readable" on public.circle_members;
create policy "Circle memberships are readable"
on public.circle_members for select
using (
  exists (
    select 1
    from public.circles as circle
    where circle.id = circle_members.circle_id
      and circle.is_public = true
  )
);

drop policy if exists "Users can join circles" on public.circle_members;
create policy "Users can join circles"
on public.circle_members for insert
with check (
  auth.uid() = user_id
  and role = 'member'
  and exists (
    select 1
    from public.circles as circle
    where circle.id = circle_members.circle_id
      and circle.is_public = true
  )
);

drop policy if exists "Users can leave circles" on public.circle_members;
create policy "Users can leave circles"
on public.circle_members for delete
using (auth.uid() = user_id and role = 'member');

drop policy if exists "Circle journey links are publicly readable" on public.circle_journeys;
create policy "Circle journey links are publicly readable"
on public.circle_journeys for select
using (
  exists (
    select 1
    from public.circles as circle
    where circle.id = circle_journeys.circle_id
      and circle.is_public = true
  )
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = circle_journeys.journey_id
      and journey.visibility = 'public'
      and journey.archived_at is null
  )
);

drop policy if exists "Journey owners can attach journeys to circles" on public.circle_journeys;
create policy "Journey owners can attach journeys to circles"
on public.circle_journeys for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = circle_journeys.journey_id
      and journey.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.circles as circle
    where circle.id = circle_journeys.circle_id
      and circle.is_public = true
  )
);

drop policy if exists "Journey owners can detach journeys from circles" on public.circle_journeys;
create policy "Journey owners can detach journeys from circles"
on public.circle_journeys for delete
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journeys as journey
    where journey.id = circle_journeys.journey_id
      and journey.user_id = auth.uid()
  )
);
