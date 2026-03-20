export function QuestionCard({
  question,
  transcript,
  interimTranscript,
}: {
  question: {
    text: string;
    sequence: number;
    total: number;
    source: "base" | "follow_up";
  };
  transcript: string;
  interimTranscript: string;
}) {
  return (
    <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
            {question.source === "follow_up" ? "Follow-up" : "Current question"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            {question.text}
          </h1>
        </div>
        <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
          {question.sequence} / {question.total}
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            Transcript
          </p>
          <p className="mt-3 min-h-16 text-sm leading-7 text-slate-200">
            {transcript || "Waiting for speech..."}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            Live draft
          </p>
          <p className="mt-3 min-h-16 text-sm leading-7 text-slate-300">
            {interimTranscript || "Interim speech text will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}
