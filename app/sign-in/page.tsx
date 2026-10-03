import { redirect } from "next/navigation";
import { AuthCard } from "../components/auth-card";
import { createClient } from "../lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <AuthCard
      title="Ingresá a JuLit"
      subtitle="Accedé con la cuenta de tu empresa para ver sus lotes y operaciones."
    >
      <SignInForm />
    </AuthCard>
  );
}
