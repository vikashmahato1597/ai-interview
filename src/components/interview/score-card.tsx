import { formatScore } from "@/lib/utils";
import type { EvaluationResult } from "@/lib/interview/schemas";

export function ScoreCard({ result }: { result: EvaluationResult }) {
  return (
    <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-200">
        Interview complete
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-white">
        Final candidate scorecard
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Technical", result.technical],
          ["Communication", result.communication],
          ["Confidence", result.confidence],
          ["Overall", result.overall],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4"
          >
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {formatScore(value as number)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
          Feedback
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-200">{result.feedback}</p>
      </div>
    </div>
  );
}
