import { redirect } from "next/navigation";
import { AuthCard } from "../components/auth-card";
import { createClient } from "../lib/supabase/server";
import { getLocale } from "../lib/locale-server";
import { getAccountDict } from "../account/i18n/server";
import { LocaleSwitch } from "../account/i18n/locale-switch";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  const [dict, locale] = await Promise.all([getAccountDict(), getLocale()]);

  return (
    <AuthCard
      title={dict.signIn.title}
      subtitle={dict.signIn.subtitle}
      headerAction={<LocaleSwitch locale={locale} />}
    >
      <SignInForm dict={dict.signIn} />
    </AuthCard>
  );
}
