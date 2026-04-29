create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_messages_body_not_blank check (length(btrim(body)) > 0),
  constraint direct_messages_no_self_send check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_created_at_idx
  on public.direct_messages (sender_id, created_at desc);

create index if not exists direct_messages_recipient_created_at_idx
  on public.direct_messages (recipient_id, created_at desc);

create index if not exists direct_messages_unread_recipient_idx
  on public.direct_messages (recipient_id, read_at)
  where read_at is null;

drop trigger if exists direct_messages_set_updated_at on public.direct_messages;
create trigger direct_messages_set_updated_at
before update on public.direct_messages
for each row execute function public.set_updated_at();

alter table public.direct_messages enable row level security;

drop policy if exists "Users can read their direct messages" on public.direct_messages;
create policy "Users can read their direct messages"
on public.direct_messages for select
using (
  auth.uid() in (sender_id, recipient_id)
  and not exists (
    select 1
    from public.user_blocks as block
    where (
      block.blocker_id = auth.uid()
      and block.blocked_id = case
        when sender_id = auth.uid() then recipient_id
        else sender_id
      end
    )
    or (
      block.blocker_id = case
        when sender_id = auth.uid() then recipient_id
        else sender_id
      end
      and block.blocked_id = auth.uid()
    )
  )
);

drop policy if exists "Users can send direct messages" on public.direct_messages;
create policy "Users can send direct messages"
on public.direct_messages for insert
with check (
  auth.uid() = sender_id
  and sender_id <> recipient_id
  and not exists (
    select 1
    from public.user_blocks as block
    where (
      block.blocker_id = sender_id
      and block.blocked_id = recipient_id
    )
    or (
      block.blocker_id = recipient_id
      and block.blocked_id = sender_id
    )
  )
);

drop policy if exists "Recipients can mark direct messages read" on public.direct_messages;
create policy "Recipients can mark direct messages read"
on public.direct_messages for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);
