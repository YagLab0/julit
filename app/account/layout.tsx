import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "./account-shell";
import { SignOutButton } from "./account-sidebar";
import { CompanyOnboardingForm } from "./company-onboarding-form";
import { getAccountContext } from "./account-data";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, company } = await getAccountContext();

  if (!user) {
    redirect("/sign-in");
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-secondary text-foreground dark:bg-background">
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-foreground"
            >
              JuLit
            </Link>
            <SignOutButton className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted" />
          </div>
          <CompanyOnboardingForm />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary text-foreground dark:bg-background">
      <AccountShell company={company} email={user.email ?? ""}>
        {children}
      </AccountShell>
    </div>
  );
}
