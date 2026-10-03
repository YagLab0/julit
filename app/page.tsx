"use client";

import { ThemeToggle } from "./components/theme-toggle";
import { ClusterSelect } from "./components/cluster-select";
import { WalletButton } from "./components/wallet-button";
import { SessionMenu } from "./components/session-menu";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight">
            Solana Starter Kit
          </span>
          <div className="flex items-center gap-3">
            <SessionMenu />
            <ThemeToggle />
            <ClusterSelect />
            <WalletButton />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6">
          <section className="flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Empty project
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Connect a wallet to get started. App content goes here.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
