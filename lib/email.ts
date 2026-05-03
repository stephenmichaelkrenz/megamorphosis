type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; skipped?: false; error: string };

const resendApiUrl = "https://api.resend.com/emails";

export const getSiteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3002");

export const getEmailFrom = () =>
  process.env.EMAIL_FROM ?? "Megamorphosis <hello@megamorphosis.com>";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured.",
    };
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to,
      subject,
      html,
      text,
    }),
  });

  const result = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; error?: string }
    | null;

  if (!response.ok) {
    return {
      sent: false,
      error:
        result?.message ??
        result?.error ??
        `Resend returned ${response.status}.`,
    };
  }

  return { sent: true, id: result?.id ?? null };
}

