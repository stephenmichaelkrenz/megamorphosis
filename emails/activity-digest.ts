import { getSiteUrl } from "@/lib/email";

type ActivityDigestEmailInput = {
  displayName: string;
  commentCount: number;
  messageCount: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatCount = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export function renderActivityDigestEmail({
  displayName,
  commentCount,
  messageCount,
}: ActivityDigestEmailInput) {
  const siteUrl = getSiteUrl();
  const safeDisplayName = escapeHtml(displayName || "there");
  const notificationsUrl = `${siteUrl}/notifications`;
  const messagesUrl = `${siteUrl}/messages`;
  const subject =
    messageCount > 0
      ? "You have unread activity on Megamorphosis"
      : "You have unread comments on Megamorphosis";
  const summaryParts = [
    commentCount > 0 ? formatCount(commentCount, "unread comment") : null,
    messageCount > 0 ? formatCount(messageCount, "unread message") : null,
  ].filter(Boolean);
  const summary = summaryParts.join(" and ");

  return {
    subject,
    text: [
      `Hi ${displayName || "there"},`,
      "",
      `You have ${summary} waiting on Megamorphosis.`,
      "",
      `Review notifications: ${notificationsUrl}`,
      messageCount > 0 ? `Open messages: ${messagesUrl}` : null,
      "",
      "No email is sent when there is no unread comment or message activity.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Unread activity on Megamorphosis</title>
  </head>
  <body style="margin:0;background:#f7f7f4;color:#181816;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <p style="margin:0 0 12px;color:#6f6f66;font-size:13px;font-weight:700;letter-spacing:0;text-transform:uppercase;">Megamorphosis</p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;">You have activity waiting, ${safeDisplayName}.</h1>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
        You have ${escapeHtml(summary)} waiting on Megamorphosis.
      </p>
      <div style="border:1px solid #deded6;background:#ffffff;border-radius:8px;padding:16px;margin:22px 0;">
        <p style="margin:0 0 8px;font-size:15px;line-height:1.5;"><strong>${commentCount}</strong> ${commentCount === 1 ? "unread comment" : "unread comments"}</p>
        <p style="margin:0;font-size:15px;line-height:1.5;"><strong>${messageCount}</strong> ${messageCount === 1 ? "unread message" : "unread messages"}</p>
      </div>
      <div style="margin:26px 0;">
        <a href="${notificationsUrl}" style="display:inline-block;background:#181816;color:#f7f7f4;text-decoration:none;border-radius:6px;padding:12px 16px;font-size:14px;font-weight:700;">Review activity</a>
      </div>
      ${
        messageCount > 0
          ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.5;"><a href="${messagesUrl}" style="color:#181816;font-weight:700;">Open messages</a></p>`
          : ""
      }
      <p style="margin:28px 0 0;color:#6f6f66;font-size:12px;line-height:1.5;">
        No email is sent when there is no unread comment or message activity.
      </p>
    </div>
  </body>
</html>`,
  };
}

