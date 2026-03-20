import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <div className="page-reveal flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(9,13,22,0.8)] px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="grid-fade absolute inset-0 opacity-40" />
        <div className="relative grid gap-10 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <span className="eyebrow">Azure OpenAI Voice Interviews</span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Production-ready AI interviews with live voice, adaptive
                follow-ups, and recruiter scoring.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                PulseHire AI combines Next.js, Supabase, Azure OpenAI, and
                browser speech APIs to run structured voice interviews end to
                end, without video or streaming complexity.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <>
                  <a
                    href="/interviews/new"
                    className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
                  >
                    Build Interview
                  </a>
                  <a
                    href="/dashboard"
                    className="rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white transition hover:border-white/30"
                  >
                    Open Dashboard
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/sign-up"
                    className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
                  >
                    Create Account
                  </a>
                  <a
                    href="/sign-in"
                    className="rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white transition hover:border-white/30"
                  >
                    Sign In
                  </a>
                </>
              )}
            </div>
            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              {[
                [
                  "1 question at a time",
                  "Adaptive logic keeps the conversation natural.",
                ],
                [
                  "Strict JSON scoring",
                  "Technical, communication, confidence, overall.",
                ],
                [
                  "Mic-only candidate flow",
                  "No camera, no account, share link driven.",
                ],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
                    {title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="ambient-ring rounded-[1.75rem]">
            <div className="glass-panel rounded-[1.75rem] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                    Live Interview State
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    AI is speaking...
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Request / Response MVP
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  "Explain how you would scale a Node.js API handling 2M daily requests.",
                  "Follow-up: what bottleneck would you attack first and why?",
                  "Evaluation: communication 8.4, confidence 7.9, technical 8.8.",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  >
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-slate-500">
                      Step 0{index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Voice stack</span>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                    Browser fallback ready
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      TTS
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      Retell / Azure / SpeechSynthesis
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      STT
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      Azure / Web Speech API
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Interviewer dashboard",
            copy:
              "Create interviews, generate questions, share candidate links, and review answers with AI scoring.",
          },
          {
            title: "Candidate room",
            copy:
              "Mic-only interview flow with timer, silence detection, and auto-progress between questions.",
          },
          {
            title: "Evaluation engine",
            copy:
              "Azure OpenAI returns structured JSON scores plus concise hiring feedback for each candidate.",
          },
        ].map((feature) => (
          <div key={feature.title} className="surface-card rounded-[1.5rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
              Core Feature
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-white">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {feature.copy}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
