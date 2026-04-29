"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DirectMessage, Profile } from "@/types";

type ProfileSummary = Pick<Profile, "id" | "username" | "display_name">;

type Conversation = {
  profile: ProfileSummary;
  latest: DirectMessage;
  unread_count: number;
};

const profileName = (profile?: ProfileSummary | null) =>
  profile?.display_name || (profile?.username ? `@${profile.username}` : "Member");

const normalizeUsername = (value: string) =>
  value.trim().replace(/^@+/, "").toLowerCase();

const messageTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export default function MessagesPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const loadMessages = useCallback(
    async (preferredUserId?: string | null) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?next=/messages");
        return;
      }

      setCurrentUserId(user.id);

      const requestedUsername =
        typeof window === "undefined"
          ? ""
          : normalizeUsername(
              new URLSearchParams(window.location.search).get("to") ?? "",
            );

      const { data: messageRows } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true })
        .limit(200);

      const { data: requestedProfile } = requestedUsername
        ? await supabase
            .from("profiles")
            .select("id, username, display_name")
            .eq("username", requestedUsername)
            .maybeSingle()
        : { data: null };

      const rows = messageRows ?? [];
      const profileIds = Array.from(
        new Set(
          [
            ...rows.map((message) =>
              message.sender_id === user.id
                ? message.recipient_id
                : message.sender_id,
            ),
            requestedProfile?.id,
          ].filter(Boolean) as string[],
        ),
      );

      const { data: profileRows } = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, display_name")
            .in("id", profileIds)
        : { data: [] };

      const nextProfiles = Object.fromEntries(
        (
          [...(profileRows ?? []), requestedProfile].filter(
            Boolean,
          ) as ProfileSummary[]
        ).map((profile) => [profile.id, profile]),
      );
      const latestMessage = rows.at(-1);
      const latestPeerId = latestMessage
        ? latestMessage.sender_id === user.id
          ? latestMessage.recipient_id
          : latestMessage.sender_id
        : null;

      setMessages(rows);
      setProfiles(nextProfiles);
      setSelectedUserId(
        (current) => preferredUserId ?? requestedProfile?.id ?? current ?? latestPeerId,
      );
      if (requestedUsername) {
        setRecipientUsername(requestedUsername);
      }
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!currentUserId) return;

    const refreshMessages = () => {
      void loadMessages(selectedUserId);
    };
    const receivedChannel = supabase
      .channel(`direct-messages-received-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        refreshMessages,
      )
      .subscribe();
    const sentChannel = supabase
      .channel(`direct-messages-sent-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        refreshMessages,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(receivedChannel);
      void supabase.removeChannel(sentChannel);
    };
  }, [currentUserId, loadMessages, selectedUserId]);

  const conversations = useMemo(() => {
    if (!currentUserId) return [];

    const byUser = new Map<string, Conversation>();

    messages.forEach((message) => {
      const peerId =
        message.sender_id === currentUserId
          ? message.recipient_id
          : message.sender_id;
      const existing = byUser.get(peerId);

      byUser.set(peerId, {
        profile: profiles[peerId] ?? {
          id: peerId,
          username: null,
          display_name: null,
        },
        latest: message,
        unread_count:
          (existing?.unread_count ?? 0) +
          (message.recipient_id === currentUserId && message.read_at === null
            ? 1
            : 0),
      });
    });

    return Array.from(byUser.values()).sort(
      (a, b) =>
        new Date(b.latest.created_at).getTime() -
        new Date(a.latest.created_at).getTime(),
    );
  }, [currentUserId, messages, profiles]);

  const thread = useMemo(() => {
    if (!currentUserId || !selectedUserId) return [];

    return messages.filter(
      (message) =>
        (message.sender_id === currentUserId &&
          message.recipient_id === selectedUserId) ||
        (message.sender_id === selectedUserId &&
          message.recipient_id === currentUserId),
    );
  }, [currentUserId, messages, selectedUserId]);

  const selectedProfile = selectedUserId ? profiles[selectedUserId] : null;

  useEffect(() => {
    const markThreadRead = async () => {
      if (!currentUserId || !selectedUserId) return;

      const unreadIds = thread
        .filter(
          (message) =>
            message.sender_id === selectedUserId &&
            message.recipient_id === currentUserId &&
            message.read_at === null,
        )
        .map((message) => message.id);

      if (unreadIds.length === 0) return;

      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("direct_messages")
        .update({ read_at: readAt })
        .in("id", unreadIds);

      if (error) return;

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.id) ? { ...message, read_at: readAt } : message,
        ),
      );
    };

    void markThreadRead();
  }, [currentUserId, selectedUserId, thread]);

  const chooseConversation = (profileId: string) => {
    setSelectedUserId(profileId);
    setRecipientUsername(profiles[profileId]?.username ?? "");
  };

  const blockSelectedUser = async () => {
    if (!currentUserId || !selectedUserId) return;

    const confirmed = window.confirm(
      `Block ${profileName(selectedProfile)}? They will no longer be able to message you, and this conversation will be hidden from your inbox.`,
    );

    if (!confirmed) return;

    setBlocking(true);

    const { error } = await supabase.from("user_blocks").upsert({
      blocker_id: currentUserId,
      blocked_id: selectedUserId,
    });

    if (error) {
      setBlocking(false);
      alert(error.message);
      return;
    }

    setSelectedUserId(null);
    setRecipientUsername("");
    setBody("");
    window.history.replaceState(null, "", "/messages");
    await loadMessages(null);
    setBlocking(false);
  };

  const sendMessage = async () => {
    const trimmedBody = body.trim();
    const username = normalizeUsername(recipientUsername);

    if (!currentUserId) {
      router.push("/auth/login?next=/messages");
      return;
    }

    if (!username) {
      alert("Recipient username is required.");
      return;
    }

    if (!trimmedBody) {
      alert("Message text is required.");
      return;
    }

    setSending(true);

    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("username", username)
      .maybeSingle();

    if (recipientError || !recipient) {
      setSending(false);
      alert("Could not find that username.");
      return;
    }

    if (recipient.id === currentUserId) {
      setSending(false);
      alert("You cannot send a DM to yourself.");
      return;
    }

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: currentUserId,
      recipient_id: recipient.id,
      body: trimmedBody,
    });

    if (error) {
      setSending(false);
      alert(error.message);
      return;
    }

    setProfiles((current) => ({ ...current, [recipient.id]: recipient }));
    setSelectedUserId(recipient.id);
    setRecipientUsername(recipient.username ?? "");
    setBody("");
    setSending(false);
    await loadMessages(recipient.id);
  };

  if (loading) {
    return <main className="wide-shell">Loading messages...</main>;
  }

  return (
    <main className="wide-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="muted mt-2">
          Private conversations with other Megamorphosis members.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <section className="panel">
          <h2 className="font-semibold">Conversations</h2>
          {conversations.length === 0 ? (
            <div className="mt-3 space-y-2">
              <p className="muted text-sm">No direct messages yet.</p>
              <Link href="/discover" className="text-sm font-semibold">
                Find people to message
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.profile.id}
                  className={`block w-full rounded-md border p-3 text-left ${
                    selectedUserId === conversation.profile.id
                      ? "border-foreground"
                      : "border-[var(--border)]"
                  }`}
                  onClick={() => chooseConversation(conversation.profile.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {profileName(conversation.profile)}
                      </p>
                      {conversation.profile.username && (
                        <p className="muted mt-1 text-xs">
                          @{conversation.profile.username}
                        </p>
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="metric-pill text-xs">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="muted mt-2 line-clamp-2 text-xs">
                    {conversation.latest.sender_id === currentUserId ? "You: " : ""}
                    {conversation.latest.body}
                  </p>
                  <time className="muted mt-2 block text-xs">
                    {messageTime(conversation.latest.created_at)}
                  </time>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {selectedProfile ? profileName(selectedProfile) : "New message"}
              </h2>
              {selectedProfile?.username && (
                <Link
                  href={`/user/${selectedProfile.username}`}
                  className="muted mt-1 inline-block text-sm font-semibold"
                >
                  @{selectedProfile.username}
                </Link>
              )}
              {thread.length > 0 && (
                <p className="muted mt-2 text-xs">
                  Latest: {messageTime(thread.at(-1)?.created_at ?? "")}
                </p>
              )}
            </div>
            {selectedProfile && selectedUserId !== currentUserId && (
              <button
                className="btn-secondary"
                disabled={blocking}
                onClick={blockSelectedUser}
              >
                {blocking ? "Blocking..." : "Block"}
              </button>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">To</span>
            <input
              className="field"
              value={recipientUsername}
              onChange={(event) => setRecipientUsername(event.target.value)}
              placeholder="username"
            />
          </label>

          <div className="mt-4 min-h-72 space-y-3 rounded-md border border-[var(--border)] p-3">
            {thread.length === 0 ? (
              <p className="muted text-sm">
                Start a private conversation by entering a username and message.
              </p>
            ) : (
              thread.map((message) => {
                const isMine = message.sender_id === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-md border border-[var(--border)] p-3 ${
                        isMine ? "bg-[var(--surface-muted)]" : "bg-[var(--surface)]"
                      }`}
                    >
                      <p className="text-sm">{message.body}</p>
                      <time className="muted mt-2 block text-xs">
                        {new Date(message.created_at).toLocaleString()}
                      </time>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold">Message</span>
            <textarea
              className="field h-24 resize-none"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a private message..."
            />
          </label>

          <div className="mt-3 flex justify-end">
            <button className="btn-primary" disabled={sending} onClick={sendMessage}>
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
