"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { UserRole } from "@/lib/interview/types";

export function SiteHeader({
  isAuthenticated,
  userRole,
}: {
  isAuthenticated: boolean;
  userRole: UserRole | null;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/interview/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(7,10,17,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between py-4">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[0.78rem]">
            PH
          </span>
          PulseHire AI
        </Link>
        <nav className="flex items-center gap-3 text-sm text-slate-300">
          {isAuthenticated ? (
            <>
              {userRole === "interviewer" ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/30 hover:text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/interviews/new"
                    className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-medium text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
                  >
                    New Interview
                  </Link>
                </>
              ) : null}
              <SignOutButton className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/30 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-medium text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
              >
                Create Account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
