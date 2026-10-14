import { createClient } from "@/lib/supabase/server";
import { authReturnPath } from "@/lib/auth-return";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

const emailTypes = new Set<EmailOtpType>(["email", "signup", "invite", "magiclink", "recovery", "email_change"]);

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type") as EmailOtpType | null;
  const next = authReturnPath(params.get("next"), type);
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  let verified = false;

  if (!params.has("error")) {
    const supabase = await createClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      verified = !error;
    } else if (tokenHash && type && emailTypes.has(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      verified = !error;
    }
  }
  if (verified) redirect(next);
  redirect("/auth/error?error=" + encodeURIComponent("Linket er ugyldigt eller udløbet. Bed om et nyt link, eller prøv at logge ind."));
}
