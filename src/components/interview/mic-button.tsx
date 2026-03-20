"use client";

export function MicButton({
  disabled,
  isListening,
  onClick,
}: {
  disabled?: boolean;
  isListening: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-18 w-18 items-center justify-center rounded-full border text-sm font-semibold transition ${
        isListening
          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
          : "border-white/12 bg-white/6 text-white"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isListening ? "Stop" : "Retry"}
    </button>
  );
}
