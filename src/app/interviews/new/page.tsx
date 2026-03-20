import { redirect } from "next/navigation";
import { InterviewBuilder } from "@/components/interviews/interview-builder";
import { ensureUserProfile } from "@/lib/interview/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewInterviewPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/sign-in");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const profile = await ensureUserProfile(user).catch(() => null);

  if (profile?.role !== "interviewer") {
    redirect("/dashboard");
  }

  return <InterviewBuilder />;
}
