import { NextResponse } from "next/server";
import { renderActivityDigestEmail } from "@/emails/activity-digest";
import { sendEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DigestCounts = {
  comments: number;
  messages: number;
};

const digestTargetFilter =
  "target_type.eq.comment,target_type.eq.post_comment,target_type.eq.direct_message";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("recipient_id, target_type")
    .is("read_at", null)
    .or(digestTargetFilter)
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const countsByRecipient = new Map<string, DigestCounts>();

  notifications?.forEach((notification) => {
    const current = countsByRecipient.get(notification.recipient_id) ?? {
      comments: 0,
      messages: 0,
    };

    if (notification.target_type === "direct_message") {
      current.messages += 1;
    } else {
      current.comments += 1;
    }

    countsByRecipient.set(notification.recipient_id, current);
  });

  let sent = 0;
  let skipped = 0;
  const failures: { userId: string; error: string }[] = [];

  for (const [userId, counts] of countsByRecipient) {
    if (counts.comments === 0 && counts.messages === 0) {
      skipped += 1;
      continue;
    }

    const [
      { data: profile },
      {
        data: { user },
        error: userError,
      },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(userId),
    ]);

    if (userError || !user?.email) {
      skipped += 1;
      failures.push({
        userId,
        error: userError?.message ?? "User email not available.",
      });
      continue;
    }

    const displayName =
      profile?.display_name ?? profile?.username ?? user.email.split("@")[0];
    const email = renderActivityDigestEmail({
      displayName,
      commentCount: counts.comments,
      messageCount: counts.messages,
    });
    const result = await sendEmail({
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.sent) {
      sent += 1;
      continue;
    }

    skipped += 1;

    if (!result.skipped) {
      failures.push({ userId, error: result.error });
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    recipients: countsByRecipient.size,
    sent,
    skipped,
    failures,
  });
}
