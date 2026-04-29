create or replace function public.prevent_direct_message_edits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sender_id <> old.sender_id
    or new.recipient_id <> old.recipient_id
    or new.body <> old.body
    or new.created_at <> old.created_at then
    raise exception 'Direct messages cannot be edited.';
  end if;

  return new;
end;
$$;

drop trigger if exists direct_messages_prevent_edits on public.direct_messages;
create trigger direct_messages_prevent_edits
before update on public.direct_messages
for each row execute function public.prevent_direct_message_edits();
