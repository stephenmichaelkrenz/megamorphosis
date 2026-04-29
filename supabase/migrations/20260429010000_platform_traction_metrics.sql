create or replace function public.get_platform_traction()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  total_profiles bigint;
  onboarded_profiles bigint;
  new_profiles_7d bigint;
  new_profiles_30d bigint;
  total_journeys bigint;
  public_journeys bigint;
  archived_journeys bigint;
  new_journeys_7d bigint;
  new_journeys_30d bigint;
  total_updates bigint;
  updates_7d bigint;
  updates_30d bigint;
  total_posts bigint;
  total_comments bigint;
  comments_7d bigint;
  total_respects bigint;
  total_follows bigint;
  total_circles bigint;
  total_circle_members bigint;
  total_checkins bigint;
  checkins_7d bigint;
  checkins_30d bigint;
  total_messages bigint;
  messages_7d bigint;
  total_milestones bigint;
  completed_milestones bigint;
  active_users_7d bigint;
  active_users_30d bigint;
  users_with_journeys bigint;
  users_with_updates bigint;
  total_reports bigint;
  hidden_comments bigint;
  total_blocks bigint;
begin
  if not public.is_platform_moderator() then
    raise exception 'Only platform moderators can read traction metrics.';
  end if;

  select count(*) into total_profiles from public.profiles;
  select count(*) into onboarded_profiles from public.profiles where onboarded is true;
  select count(*) into new_profiles_7d from public.profiles where created_at >= now() - interval '7 days';
  select count(*) into new_profiles_30d from public.profiles where created_at >= now() - interval '30 days';

  select count(*) into total_journeys from public.journeys;
  select count(*) into public_journeys from public.journeys where visibility = 'public' and archived_at is null;
  select count(*) into archived_journeys from public.journeys where archived_at is not null;
  select count(*) into new_journeys_7d from public.journeys where created_at >= now() - interval '7 days';
  select count(*) into new_journeys_30d from public.journeys where created_at >= now() - interval '30 days';

  select count(*) into total_updates from public.journey_updates;
  select count(*) into updates_7d from public.journey_updates where created_at >= now() - interval '7 days';
  select count(*) into updates_30d from public.journey_updates where created_at >= now() - interval '30 days';

  select count(*) into total_posts from public.posts;
  select count(*) into total_comments from public.journey_update_comments where deleted_at is null;
  select count(*) into comments_7d from public.journey_update_comments where deleted_at is null and created_at >= now() - interval '7 days';
  select count(*) into total_respects from public.respects;
  select count(*) into total_follows from public.follows;

  select count(*) into total_circles from public.circles;
  select count(*) into total_circle_members from public.circle_members;
  select count(*) into total_checkins from public.circle_checkins where deleted_at is null;
  select count(*) into checkins_7d from public.circle_checkins where deleted_at is null and created_at >= now() - interval '7 days';
  select count(*) into checkins_30d from public.circle_checkins where deleted_at is null and created_at >= now() - interval '30 days';

  select count(*) into total_messages from public.direct_messages;
  select count(*) into messages_7d from public.direct_messages where created_at >= now() - interval '7 days';

  select count(*) into total_milestones from public.journey_milestones;
  select count(*) into completed_milestones from public.journey_milestones where completed_at is not null;

  select count(*) into users_with_journeys from (
    select distinct user_id from public.journeys
  ) as users;
  select count(*) into users_with_updates from (
    select distinct user_id from public.journey_updates
  ) as users;

  select count(*) into active_users_7d
  from (
    select user_id from public.journeys where created_at >= now() - interval '7 days'
    union
    select user_id from public.journey_updates where created_at >= now() - interval '7 days'
    union
    select user_id from public.posts where created_at >= now() - interval '7 days'
    union
    select user_id from public.journey_update_comments where created_at >= now() - interval '7 days'
    union
    select user_id from public.respects where created_at >= now() - interval '7 days'
    union
    select follower_id as user_id from public.follows where created_at >= now() - interval '7 days'
    union
    select user_id from public.circle_checkins where created_at >= now() - interval '7 days'
    union
    select sender_id as user_id from public.direct_messages where created_at >= now() - interval '7 days'
  ) as users;

  select count(*) into active_users_30d
  from (
    select user_id from public.journeys where created_at >= now() - interval '30 days'
    union
    select user_id from public.journey_updates where created_at >= now() - interval '30 days'
    union
    select user_id from public.posts where created_at >= now() - interval '30 days'
    union
    select user_id from public.journey_update_comments where created_at >= now() - interval '30 days'
    union
    select user_id from public.respects where created_at >= now() - interval '30 days'
    union
    select follower_id as user_id from public.follows where created_at >= now() - interval '30 days'
    union
    select user_id from public.circle_checkins where created_at >= now() - interval '30 days'
    union
    select sender_id as user_id from public.direct_messages where created_at >= now() - interval '30 days'
  ) as users;

  select count(*) into total_reports from public.comment_reports;
  select count(*) into hidden_comments from public.journey_update_comments where hidden_at is not null;
  select count(*) into total_blocks from public.user_blocks;

  return jsonb_build_object(
    'generated_at', now(),
    'acquisition', jsonb_build_object(
      'total_profiles', total_profiles,
      'onboarded_profiles', onboarded_profiles,
      'new_profiles_7d', new_profiles_7d,
      'new_profiles_30d', new_profiles_30d
    ),
    'creation', jsonb_build_object(
      'total_journeys', total_journeys,
      'public_journeys', public_journeys,
      'archived_journeys', archived_journeys,
      'new_journeys_7d', new_journeys_7d,
      'new_journeys_30d', new_journeys_30d,
      'total_updates', total_updates,
      'updates_7d', updates_7d,
      'updates_30d', updates_30d,
      'total_posts', total_posts,
      'total_milestones', total_milestones,
      'completed_milestones', completed_milestones
    ),
    'engagement', jsonb_build_object(
      'total_comments', total_comments,
      'comments_7d', comments_7d,
      'total_respects', total_respects,
      'total_follows', total_follows,
      'total_messages', total_messages,
      'messages_7d', messages_7d
    ),
    'community', jsonb_build_object(
      'total_circles', total_circles,
      'total_circle_members', total_circle_members,
      'total_checkins', total_checkins,
      'checkins_7d', checkins_7d,
      'checkins_30d', checkins_30d
    ),
    'retention', jsonb_build_object(
      'active_users_7d', active_users_7d,
      'active_users_30d', active_users_30d,
      'users_with_journeys', users_with_journeys,
      'users_with_updates', users_with_updates
    ),
    'moderation', jsonb_build_object(
      'total_reports', total_reports,
      'hidden_comments', hidden_comments,
      'total_blocks', total_blocks
    )
  );
end;
$$;

revoke all on function public.get_platform_traction() from public;
grant execute on function public.get_platform_traction() to authenticated;
