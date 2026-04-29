alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'respect', 'comment', 'circle_checkin'));

alter table public.notifications
  drop constraint if exists notifications_target_type_check;

alter table public.notifications
  add constraint notifications_target_type_check
  check (target_type in ('profile', 'post', 'journey_update', 'comment', 'circle_checkin'));

create or replace function public.create_circle_checkin_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    target_type,
    target_id
  )
  select
    member.user_id,
    new.user_id,
    'circle_checkin',
    'circle_checkin',
    new.id
  from public.circle_members as member
  where member.circle_id = new.circle_id
    and member.user_id <> new.user_id
    and not exists (
      select 1
      from public.user_blocks as block
      where (
        block.blocker_id = member.user_id
        and block.blocked_id = new.user_id
      )
      or (
        block.blocker_id = new.user_id
        and block.blocked_id = member.user_id
      )
    );

  return new;
end;
$$;

drop trigger if exists circle_checkins_create_notification on public.circle_checkins;
create trigger circle_checkins_create_notification
after insert on public.circle_checkins
for each row execute function public.create_circle_checkin_notification();
