import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "../lib/locale-server";
import { AccountShell } from "./account-shell";
import { SignOutButton } from "./account-sidebar";
import { CompanyOnboardingForm } from "./company-onboarding-form";
import { getAccountContext } from "./account-data";
import { getAccountDict } from "./i18n/server";
import { AccountI18nProvider } from "./i18n/context";
import { LocaleSwitch } from "./i18n/locale-switch";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ user, company }, dict, locale] = await Promise.all([
    getAccountContext(),
    getAccountDict(),
    getLocale(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const isAdminUser =
    user.email?.toLowerCase().includes("admin") ||
    user.app_metadata?.role === "admin" ||
    company?.companyType === "admin";

  if (!isAdminUser && !company) {
    return (
      <AccountI18nProvider dict={dict}>
        <div className="min-h-screen bg-secondary text-foreground">
          <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
            <div className="mb-6 flex items-center justify-between">
              <Link
                href="/"
                className="text-sm font-bold tracking-tight text-foreground"
              >
                JuLit
              </Link>
              <div className="flex items-center gap-2">
                <LocaleSwitch locale={locale} />
                <SignOutButton className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted" />
              </div>
            </div>
            <CompanyOnboardingForm />
          </main>
        </div>
      </AccountI18nProvider>
    );
  }

  const activeCompany = company ?? {
    name: "JuLit Protocol Admin",
    companyType: "admin" as const,
    walletAddress: null,
    walletVerifiedAt: null,
    originId: null,
    purityPct: null,
    waterM3PerTonne: null,
    carbonKgCo2ePerTonne: null,
  };

  return (
    <div className="min-h-screen bg-secondary text-foreground">
      <AccountShell
        company={activeCompany}
        email={user.email ?? ""}
        dict={dict}
        locale={locale}
      >
        {children}
      </AccountShell>
    </div>
  );
}
