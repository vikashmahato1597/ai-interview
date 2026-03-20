"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export function SignOutButton({
  className = "",
  label = "Log out",
}: SignOutButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      startTransition(() => {
        router.push("/sign-in");
        router.refresh();
      });
    } catch (error) {
      console.error("Unable to sign out", error);
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={submitting}
      className={className}
    >
      {submitting ? "Logging out..." : label}
    </button>
  );
}
