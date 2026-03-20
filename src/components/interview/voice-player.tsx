import type { VoiceCapabilitySummary } from "@/lib/voice/config";

export function VoicePlayer({
  phase,
  voiceSummary,
}: {
  phase: "speaking" | "listening" | "processing" | "idle";
  voiceSummary: VoiceCapabilitySummary;
}) {
  const label =
    phase === "speaking"
      ? "AI is speaking..."
      : phase === "listening"
        ? "Listening..."
        : phase === "processing"
          ? "Reviewing answer..."
          : "Waiting";

  return (
    <div className="surface-card rounded-[1.5rem] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
        Voice status
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{label}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">TTS</p>
          <p className="mt-2 text-sm text-slate-200">{voiceSummary.ttsProvider}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">STT</p>
          <p className="mt-2 text-sm text-slate-200">{voiceSummary.sttProvider}</p>
        </div>
      </div>
    </div>
  );
}
