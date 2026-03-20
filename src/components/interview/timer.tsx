export function Timer({
  remainingSeconds,
  totalSeconds,
}: {
  remainingSeconds: number;
  totalSeconds: number;
}) {
  const progress = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  return (
    <div className="surface-card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
          Answer timer
        </p>
        <span className="text-lg font-semibold text-white">{remainingSeconds}s</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
