import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { SiteHeader } from "@/components/navigation/site-header";
import type { UserRole } from "@/lib/interview/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "PulseHire AI",
  description: "Real-time AI voice interviews with Azure OpenAI and Supabase.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const userRole =
    user?.user_metadata?.role === "interviewer" ||
    user?.user_metadata?.role === "candidate"
      ? (user.user_metadata.role as UserRole)
      : null;

  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${ibmPlexMono.variable} bg-[var(--color-background)] text-[var(--color-foreground)] antialiased`}
      >
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,186,116,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_28%),linear-gradient(180deg,_rgba(11,15,25,0.02),_rgba(11,15,25,0.12))]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-8">
            <SiteHeader isAuthenticated={Boolean(user)} userRole={userRole} />
            <main className="flex-1 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
