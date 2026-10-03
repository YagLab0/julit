import { redirect } from "next/navigation";
import { AuthCard } from "../components/auth-card";
import { createClient } from "../lib/supabase/server";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/account");
  }

  return (
    <AuthCard
      title="Creá la cuenta de tu empresa"
      subtitle="Una cuenta por empresa. El tipo elegido define las operaciones disponibles."
    >
      <SignUpForm />
    </AuthCard>
  );
}
