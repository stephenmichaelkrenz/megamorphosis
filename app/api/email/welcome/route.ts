import { NextResponse } from "next/server";
import { renderWelcomeEmail } from "@/emails/welcome";
import { sendEmail } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (!profile?.onboarded || !profile.username) {
    return NextResponse.json(
      { error: "Complete onboarding before sending welcome email." },
      { status: 400 },
    );
  }

  const email = renderWelcomeEmail({
    displayName: profile.display_name ?? profile.username,
    username: profile.username,
  });
  const result = await sendEmail({
    to: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (!result.sent && !result.skipped) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

