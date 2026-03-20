"use client";

import { useState } from "react";
import type { InterviewDifficulty } from "@/lib/interview/types";
import { MicButton } from "@/components/interview/mic-button";
import { QuestionCard } from "@/components/interview/question-card";
import { ScoreCard } from "@/components/interview/score-card";
import { Timer } from "@/components/interview/timer";
import { VoicePlayer } from "@/components/interview/voice-player";
import { useInterviewSession } from "@/hooks/use-interview-session";

export function InterviewRoom({
  interviewSlug,
  interviewSummary,
}: {
  interviewSlug: string;
  interviewSummary?: {
    title: string;
    topic: string;
    difficulty: InterviewDifficulty;
    questionCount: number;
  } | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const session = useInterviewSession({
    interviewSlug,
    initialInterview: interviewSummary ?? undefined,
  });

  const handleStart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await session.startInterview({ name, email });
  };

  const handleEndInterview = async () => {
    if (
      !window.confirm(
        "End the interview now and score only the answers already recorded?",
      )
    ) {
      return;
    }

    await session.endInterview();
  };

  if (session.result) {
    return <ScoreCard result={session.result} />;
  }

  if (!session.hasStarted) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleStart} className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
            Candidate intake
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            {interviewSummary?.title ?? "AI Voice Interview"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Enter your details, then start the interview. The app will request
            microphone permission only.
          </p>

          <div className="mt-8 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Full name</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                placeholder="Your name"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                placeholder="name@example.com"
              />
            </label>
          </div>

          {session.error ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {session.error}
            </div>
          ) : null}

          <button
            type="submit"
            className="mt-8 w-full rounded-full bg-[var(--color-accent)] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)]"
          >
            Start interview
          </button>
        </form>

        <div className="space-y-6">
          <div className="surface-card rounded-[2rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
              Interview outline
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <p>Topic: {interviewSummary?.topic ?? "Technical discussion"}</p>
              <p>Difficulty: {interviewSummary?.difficulty ?? "medium"}</p>
              <p>
                Planned questions:{" "}
                {interviewSummary?.questionCount ?? "Generated at runtime"}
              </p>
              <p>
                Speech recognition available:{" "}
                {session.isSpeechRecognitionSupported ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="surface-card rounded-[2rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
              Flow
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>1. AI asks a question out loud.</li>
              <li>2. You answer with your microphone.</li>
              <li>3. Silence auto-submits if you stop speaking.</li>
              <li>4. AI follows up or moves to the next question.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <QuestionCard
        question={session.question ?? { text: "", sequence: 0, total: 0, source: "base" }}
        transcript={session.transcript}
        interimTranscript={session.interimTranscript}
      />

      <div className="space-y-6">
        <VoicePlayer
          phase={
            session.phase === "speaking" ||
            session.phase === "listening" ||
            session.phase === "processing"
              ? session.phase
              : "idle"
          }
          voiceSummary={session.voiceSummary}
        />
        <Timer
          remainingSeconds={session.remainingSeconds}
          totalSeconds={session.answerTimeLimitSeconds}
        />
        <div className="surface-card rounded-[1.5rem] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
                Interview state
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {session.activityLabel}
              </p>
            </div>
            <MicButton
              isListening={session.phase === "listening"}
              onClick={
                session.phase === "listening"
                  ? session.stopListening
                  : session.retryListening
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleEndInterview}
              disabled={session.phase === "processing" || session.isEnding}
              className="rounded-full border border-red-400/25 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:border-red-300/45 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {session.isEnding ? "Ending..." : "End interview"}
            </button>
            <p className="text-sm text-slate-400">
              Optional: finish now and evaluate the answers already submitted.
            </p>
          </div>
          {session.error ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {session.error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
