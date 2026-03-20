import Link from "next/link";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  ensureUserProfile,
  getInterviewerDashboardData,
} from "@/lib/interview/repository";
import { getOriginFromHeaders } from "@/lib/request-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">
          Supabase configuration is still required.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
          `SUPABASE_SERVICE_ROLE_KEY`, then reload the dashboard.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">
          Sign in to access the interviewer dashboard.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Authentication uses Supabase email and password. After signing in you
          can create interviews, generate candidate links, and review results.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const profile = await ensureUserProfile(user).catch(() => null);
  const headerStore = await headers();
  const appUrl = getOriginFromHeaders(headerStore) ?? "http://localhost:3000";
  let dashboard: Awaited<ReturnType<typeof getInterviewerDashboardData>> = [];

  try {
    dashboard = await getInterviewerDashboardData(user.id, appUrl);
  } catch {
    dashboard = [];
  }
  const candidatesCount = dashboard.reduce(
    (sum: number, interview: (typeof dashboard)[number]) =>
      sum + interview.candidates.length,
    0,
  );
  const completedCount = dashboard.reduce(
    (sum: number, interview: (typeof dashboard)[number]) =>
      sum +
      interview.candidates.filter(
        (candidate: (typeof interview.candidates)[number]) => candidate.score,
      ).length,
    0,
  );
  const summaryCards: Array<[string, number]> = [
    ["Interviews", dashboard.length],
    ["Candidates", candidatesCount],
    ["Scored", completedCount],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
            Interviewer dashboard
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            {profile?.full_name ?? user.email ?? "PulseHire AI"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Role: {profile?.role ?? "interviewer"}. Review candidate sessions,
            transcript answers, and final JSON scorecards from Azure OpenAI.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/interviews/new"
              className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
            >
              Create interview
            </Link>
            <SignOutButton
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {summaryCards.map(([label, value]) => (
            <div key={label} className="surface-card rounded-[1.5rem] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
              <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {dashboard.length === 0 ? (
        <div className="surface-card rounded-[2rem] p-6">
          <h2 className="text-2xl font-semibold text-white">
            No interviews yet.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Create your first interview to generate a shareable candidate link
            and start collecting responses.
          </p>
        </div>
      ) : (
        dashboard.map((interview: (typeof dashboard)[number]) => {
          const scoredCandidates = interview.candidates.filter(
            (candidate: (typeof interview.candidates)[number]) => candidate.score,
          );
          const pendingCandidates =
            interview.candidates.length - scoredCandidates.length;
          const averageOverall = scoredCandidates.length
            ? (
                scoredCandidates.reduce(
                  (sum, candidate) => sum + (candidate.score?.overall ?? 0),
                  0,
                ) / scoredCandidates.length
              ).toFixed(1)
            : null;

          return (
          <section key={interview.id} className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
                  {interview.difficulty} interview
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  {interview.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {interview.topic}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-200">
                <p>Questions: {interview.questionCount}</p>
                <p>Candidates: {interview.candidates.length}</p>
                <p>Scored: {scoredCandidates.length}</p>
                <p>Pending: {pendingCandidates}</p>
                <p>Average overall: {averageOverall ?? "Pending"}</p>
                <p className="mt-2 break-all text-xs text-slate-400">
                  {interview.shareUrl}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {interview.candidates.length === 0 ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-sm text-slate-300">
                  No candidates have taken this interview yet.
                </div>
              ) : (
                interview.candidates.map(
                  (candidate: (typeof interview.candidates)[number]) => (
                  <div
                    key={candidate.id}
                    className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          {candidate.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">{candidate.email}</p>
                      </div>
                      <div className="text-right text-sm text-slate-300">
                        <p>Status: {candidate.status}</p>
                        <p>
                          Overall: {candidate.score ? candidate.score.overall : "Pending"}
                        </p>
                      </div>
                    </div>

                    {candidate.score ? (
                      <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {[
                            ["Technical", candidate.score.technical],
                            ["Communication", candidate.score.communication],
                            ["Confidence", candidate.score.confidence],
                            ["Overall", candidate.score.overall],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/10 p-4"
                            >
                              <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-emerald-200/80">
                                {label}
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-emerald-50">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                          {candidate.score.feedback}
                        </div>
                      </>
                    ) : null}

                    <div className="mt-4 grid gap-3">
                      {candidate.responses.map(
                        (
                          response: (typeof candidate.responses)[number],
                          index: number,
                        ) => (
                        <div
                          key={`${candidate.id}-${index}`}
                          className="rounded-[1.25rem] border border-white/8 bg-slate-950/55 p-4"
                        >
                          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                            {response.isFollowUp ? "Follow-up" : "Question"}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-200">
                            {response.askedQuestion}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-300">
                            {response.answerText}
                          </p>
                        </div>
                      ),
                      )}
                    </div>
                  </div>
                  ),
                )
              )}
            </div>
          </section>
          );
        })
      )}
    </div>
  );
}
