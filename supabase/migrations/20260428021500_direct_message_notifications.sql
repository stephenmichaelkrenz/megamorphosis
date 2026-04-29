alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'respect', 'comment', 'circle_checkin', 'direct_message'));

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (target_type in ('profile', 'post', 'journey_update', 'comment', 'circle_checkin', 'direct_message'));

create or replace function public.create_direct_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_id <> new.recipient_id
    and not exists (
      select 1
      from public.user_blocks as block
      where (
        block.blocker_id = new.recipient_id
        and block.blocked_id = new.sender_id
      )
      or (
        block.blocker_id = new.sender_id
        and block.blocked_id = new.recipient_id
      )
    ) then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      target_type,
      target_id
    )
    values (
      new.recipient_id,
      new.sender_id,
      'direct_message',
      'direct_message',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists direct_messages_create_notification on public.direct_messages;
create trigger direct_messages_create_notification
after insert on public.direct_messages
for each row execute function public.create_direct_message_notification();
