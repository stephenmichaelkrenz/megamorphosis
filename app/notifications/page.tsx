"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Notification } from "@/types";

type ProfileSummary = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type PostSummary = {
  id: string;
  content: string;
};

type JourneyUpdateSummary = {
  id: string;
  journey_id: string;
  text: string;
};

type CommentSummary = {
  id: string;
  journey_id: string;
  journey_update_id: string;
  body: string;
};

type PostCommentSummary = {
  id: string;
  post_id: string;
  body: string;
};

type CircleCheckinSummary = {
  id: string;
  circle_id: string;
  prompt: string;
  body: string;
};

type CircleSummary = {
  id: string;
  name: string;
  slug: string;
};

type DirectMessageSummary = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
};

type NotificationData = {
  notifications: Notification[];
  profiles: Record<string, ProfileSummary>;
  posts: Record<string, PostSummary>;
  journeyUpdates: Record<string, JourneyUpdateSummary>;
  comments: Record<string, CommentSummary>;
  postComments: Record<string, PostCommentSummary>;
  circleCheckins: Record<string, CircleCheckinSummary>;
  circles: Record<string, CircleSummary>;
  directMessages: Record<string, DirectMessageSummary>;
};

const snippet = (value: string, maxLength = 72) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
};

const fetchNotificationData = async (userId: string): Promise<NotificationData> => {
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, recipient_id, actor_id, type, target_type, target_id, read_at, created_at",
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];
  const actorIds = Array.from(
    new Set(
      notifications
        .map((notification) => notification.actor_id)
        .filter((actorId): actorId is string => Boolean(actorId)),
    ),
  );
  const postIds = notifications
    .filter((notification) => notification.target_type === "post")
    .map((notification) => notification.target_id);
  const journeyUpdateIds = notifications
    .filter((notification) => notification.target_type === "journey_update")
    .map((notification) => notification.target_id);
  const commentIds = notifications
    .filter((notification) => notification.target_type === "comment")
    .map((notification) => notification.target_id);
  const postCommentIds = notifications
    .filter((notification) => notification.target_type === "post_comment")
    .map((notification) => notification.target_id);
  const circleCheckinIds = notifications
    .filter((notification) => notification.target_type === "circle_checkin")
    .map((notification) => notification.target_id);
  const directMessageIds = notifications
    .filter((notification) => notification.target_type === "direct_message")
    .map((notification) => notification.target_id);

  const [
    { data: profileData },
    { data: postData },
    { data: journeyUpdateData },
    { data: commentData },
    { data: postCommentData },
    { data: circleCheckinData },
    { data: directMessageData },
  ] = await Promise.all([
    actorIds.length
      ? supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", actorIds)
      : { data: [] },
    postIds.length
      ? supabase.from("posts").select("id, content").in("id", postIds)
      : { data: [] },
    journeyUpdateIds.length
      ? supabase
          .from("journey_updates")
          .select("id, journey_id, text")
          .in("id", journeyUpdateIds)
      : { data: [] },
    commentIds.length
      ? supabase
          .from("journey_update_comments")
          .select("id, journey_id, journey_update_id, body")
          .in("id", commentIds)
      : { data: [] },
    postCommentIds.length
      ? supabase
          .from("post_comments")
          .select("id, post_id, body")
          .in("id", postCommentIds)
      : { data: [] },
    circleCheckinIds.length
      ? supabase
          .from("circle_checkins")
          .select("id, circle_id, prompt, body")
          .in("id", circleCheckinIds)
      : { data: [] },
    directMessageIds.length
      ? supabase
          .from("direct_messages")
          .select("id, sender_id, recipient_id, body")
          .in("id", directMessageIds)
      : { data: [] },
  ]);

  const circleIds = Array.from(
    new Set(
      ((circleCheckinData ?? []) as CircleCheckinSummary[]).map(
        (checkin) => checkin.circle_id,
      ),
    ),
  );
  const { data: circleData } = circleIds.length
    ? await supabase.from("circles").select("id, name, slug").in("id", circleIds)
    : { data: [] };

  return {
    notifications,
    profiles: Object.fromEntries(
      ((profileData ?? []) as ProfileSummary[]).map((profile) => [
        profile.id,
        profile,
      ]),
    ),
    posts: Object.fromEntries(
      ((postData ?? []) as PostSummary[]).map((post) => [post.id, post]),
    ),
    journeyUpdates: Object.fromEntries(
      ((journeyUpdateData ?? []) as JourneyUpdateSummary[]).map((update) => [
        update.id,
        update,
      ]),
    ),
    comments: Object.fromEntries(
      ((commentData ?? []) as CommentSummary[]).map((comment) => [
        comment.id,
        comment,
      ]),
    ),
    postComments: Object.fromEntries(
      ((postCommentData ?? []) as PostCommentSummary[]).map((comment) => [
        comment.id,
        comment,
      ]),
    ),
    circleCheckins: Object.fromEntries(
      ((circleCheckinData ?? []) as CircleCheckinSummary[]).map((checkin) => [
        checkin.id,
        checkin,
      ]),
    ),
    circles: Object.fromEntries(
      ((circleData ?? []) as CircleSummary[]).map((circle) => [
        circle.id,
        circle,
      ]),
    ),
    directMessages: Object.fromEntries(
      ((directMessageData ?? []) as DirectMessageSummary[]).map((message) => [
        message.id,
        message,
      ]),
    ),
  };
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [posts, setPosts] = useState<Record<string, PostSummary>>({});
  const [journeyUpdates, setJourneyUpdates] = useState<
    Record<string, JourneyUpdateSummary>
  >({});
  const [comments, setComments] = useState<Record<string, CommentSummary>>({});
  const [postComments, setPostComments] = useState<
    Record<string, PostCommentSummary>
  >({});
  const [circleCheckins, setCircleCheckins] = useState<
    Record<string, CircleCheckinSummary>
  >({});
  const [circles, setCircles] = useState<Record<string, CircleSummary>>({});
  const [directMessages, setDirectMessages] = useState<
    Record<string, DirectMessageSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => notification.read_at === null)
        .length,
    [notifications],
  );

  const applyNotificationData = (data: NotificationData) => {
    setNotifications(data.notifications);
    setProfiles(data.profiles);
    setPosts(data.posts);
    setJourneyUpdates(data.journeyUpdates);
    setComments(data.comments);
    setPostComments(data.postComments);
    setCircleCheckins(data.circleCheckins);
    setCircles(data.circles);
    setDirectMessages(data.directMessages);
  };

  useEffect(() => {
    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?next=/notifications");
        return;
      }

      const notificationData = await fetchNotificationData(user.id);
      applyNotificationData(notificationData);
      setLoading(false);
    };

    void loadNotifications();
  }, [router]);

  const markAllRead = async () => {
    setMarkingRead(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?next=/notifications");
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .is("read_at", null);

    if (error) {
      setMarkingRead(false);
      alert(error.message);
      return;
    }

    const notificationData = await fetchNotificationData(user.id);
    applyNotificationData(notificationData);
    setMarkingRead(false);
  };

  const renderNotification = (notification: Notification) => {
    const actor = notification.actor_id
      ? profiles[notification.actor_id]
      : null;
    const actorName =
      actor?.display_name || (actor?.username ? `@${actor.username}` : "Someone");
    const actorHref = actor?.username ? `/user/${actor.username}` : null;

    if (notification.type === "follow") {
      return {
        href: actorHref ?? "/discover",
        message: `${actorName} followed you.`,
        detail: "New connection",
      };
    }

    if (notification.target_type === "post") {
      const post = posts[notification.target_id];
      return {
        href: post ? `/#post-${post.id}` : "/",
        message: `${actorName} gave Respect to your post.`,
        detail: post ? snippet(post.content) : "Feed post",
      };
    }

    if (notification.target_type === "comment") {
      const comment = comments[notification.target_id];
      return {
        href: comment
          ? `/journey/${comment.journey_id}#comments-${comment.journey_update_id}`
          : "/dashboard",
        message: `${actorName} commented on your journey update.`,
        detail: comment ? snippet(comment.body) : "Comment",
      };
    }

    if (notification.target_type === "post_comment") {
      const comment = postComments[notification.target_id];
      return {
        href: comment ? `/#post-comments-${comment.post_id}` : "/",
        message: `${actorName} commented on your feed post.`,
        detail: comment ? snippet(comment.body) : "Comment",
      };
    }

    if (notification.target_type === "circle_checkin") {
      const checkin = circleCheckins[notification.target_id];
      const circle = checkin ? circles[checkin.circle_id] : null;

      return {
        href: circle ? `/circles/${circle.slug}` : "/circles",
        message: `${actorName} posted a Circle check-in.`,
        detail: circle
          ? `${circle.name}: ${snippet(checkin?.body ?? "Check-in")}`
          : "Circle check-in",
      };
    }

    if (notification.target_type === "direct_message") {
      const message = directMessages[notification.target_id];

      return {
        href: actor?.username
          ? `/messages?to=${encodeURIComponent(actor.username)}`
          : "/messages",
        message: `${actorName} sent you a direct message.`,
        detail: message ? snippet(message.body) : "Direct message",
      };
    }

    const update = journeyUpdates[notification.target_id];
    return {
      href: update
        ? `/journey/${update.journey_id}#comments-${update.id}`
        : "/dashboard",
      message: `${actorName} gave Respect to your journey update.`,
      detail: update ? snippet(update.text) : "Journey update",
    };
  };

  const markNotificationRead = async (notification: Notification) => {
    if (notification.read_at !== null) return;

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read_at: readAt } : item,
      ),
    );

    await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", notification.id);
  };

  if (loading) {
    return <main className="page-shell">Loading notifications...</main>;
  }

  return (
    <main className="page-shell">
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="muted mt-1 text-sm">
            {unreadCount} unread {unreadCount === 1 ? "moment" : "moments"}
          </p>
        </div>

        <button
          className="btn-secondary shrink-0"
          disabled={markingRead || unreadCount === 0}
          onClick={markAllRead}
        >
          {markingRead ? "Marking..." : "Mark Read"}
        </button>
      </section>

      {notifications.length === 0 ? (
        <p className="muted panel">
          No notifications yet. Respect, follows, comments, and messages will show up here.
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const item = renderNotification(notification);
            const isUnread = notification.read_at === null;

            return (
              <Link
                key={notification.id}
                href={item.href}
                className={`link-panel ${
                  isUnread
                    ? "border-[var(--foreground)] bg-[var(--surface-muted)]"
                    : ""
                }`}
                onClick={() => {
                  void markNotificationRead(notification);
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${
                      isUnread ? "bg-current" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.message}</p>
                      <span className="metric-pill text-xs">
                        {isUnread ? "Unread" : "Read"}
                      </span>
                    </div>
                    <p className="muted mt-1 text-sm">{item.detail}</p>
                    <time className="muted mt-3 block text-xs font-semibold uppercase">
                      {new Date(notification.created_at).toLocaleString()}
                    </time>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
