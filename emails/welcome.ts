import { getSiteUrl } from "@/lib/email";

type WelcomeEmailInput = {
  displayName: string;
  username: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function renderWelcomeEmail({ displayName, username }: WelcomeEmailInput) {
  const siteUrl = getSiteUrl();
  const safeDisplayName = escapeHtml(displayName || username);
  const profileUrl = `${siteUrl}/user/${encodeURIComponent(username)}`;
  const welcomeUrl = `${siteUrl}/welcome`;
  const circlesUrl = `${siteUrl}/circles`;

  return {
    subject: "Welcome to Megamorphosis",
    text: [
      `Welcome to Megamorphosis, ${displayName || username}.`,
      "",
      "Your profile is ready. Post your first check-in, find a Circle, and start building visible momentum.",
      "",
      `Continue here: ${welcomeUrl}`,
      `Your profile: ${profileUrl}`,
      `Explore Circles: ${circlesUrl}`,
    ].join("\n"),
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to Megamorphosis</title>
  </head>
  <body style="margin:0;background:#f7f7f4;color:#181816;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
      <p style="margin:0 0 12px;color:#6f6f66;font-size:13px;font-weight:700;letter-spacing:0;text-transform:uppercase;">Megamorphosis</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">Welcome, ${safeDisplayName}.</h1>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
        Your profile is ready. Post your first check-in, find a Circle, and start building visible momentum.
      </p>
      <div style="margin:26px 0;">
        <a href="${welcomeUrl}" style="display:inline-block;background:#181816;color:#f7f7f4;text-decoration:none;border-radius:6px;padding:12px 16px;font-size:14px;font-weight:700;">Post your first check-in</a>
      </div>
      <div style="border:1px solid #deded6;background:#ffffff;border-radius:8px;padding:16px;">
        <p style="margin:0 0 10px;font-weight:700;">Good next moves</p>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.5;"><a href="${profileUrl}" style="color:#181816;font-weight:700;">View your profile</a></p>
        <p style="margin:0;font-size:14px;line-height:1.5;"><a href="${circlesUrl}" style="color:#181816;font-weight:700;">Explore Circles</a></p>
      </div>
      <p style="margin:28px 0 0;color:#6f6f66;font-size:12px;line-height:1.5;">
        You received this because you created a Megamorphosis account.
      </p>
    </div>
  </body>
</html>`,
  };
}

