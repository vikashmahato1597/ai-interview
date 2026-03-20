"use client";

import { useState } from "react";
import type { InterviewDifficulty } from "@/lib/interview/types";

interface DraftQuestion {
  id: string;
  prompt: string;
  source: "manual" | "ai";
  difficulty: InterviewDifficulty;
  rationale?: string;
}

function createQuestion(
  prompt = "",
  source: "manual" | "ai" = "manual",
  difficulty: InterviewDifficulty = "medium",
  rationale = "",
): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    prompt,
    source,
    difficulty,
    rationale,
  };
}

export function InterviewBuilder() {
  const [title, setTitle] = useState("Senior Full-Stack Engineer");
  const [topic, setTopic] = useState(
    "Distributed systems and web platform architecture",
  );
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("medium");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    createQuestion("Walk me through a production API you designed end to end."),
    createQuestion(
      "How do you reason about caching, consistency, and failure recovery?",
    ),
    createQuestion("Describe a hard trade-off you made while scaling a product."),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    title: string;
    shareUrl: string;
    absoluteShareUrl: string;
    questionCount: number;
  } | null>(null);

  const filledQuestions = questions.filter((question) => question.prompt.trim());

  const updateQuestion = (
    id: string,
    patch: Partial<Omit<DraftQuestion, "id">>,
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  };

  const addQuestion = () => {
    setQuestions((current) => [
      ...current,
      createQuestion("", "manual", difficulty),
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((current) => current.filter((question) => question.id !== id));
  };

  const generateQuestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          topic,
          difficulty,
          count: 5,
        }),
      });
      const data = (await response.json()) as {
        questions?: Array<{
          prompt: string;
          source: "ai";
          difficulty: InterviewDifficulty;
          rationale?: string;
        }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to generate questions.");
      }

      setQuestions(
        (data.questions ?? []).map((question) =>
          createQuestion(
            question.prompt,
            "ai",
            question.difficulty,
            question.rationale ?? "",
          ),
        ),
      );
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate questions.",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveInterview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          topic,
          difficulty,
          questions: filledQuestions.map((question) => ({
            prompt: question.prompt,
            source: question.source,
            difficulty: question.difficulty,
            rationale: question.rationale ?? null,
          })),
        }),
      });
      const data = (await response.json()) as {
        title?: string;
        shareUrl?: string;
        absoluteShareUrl?: string;
        questionCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save interview.");
      }

      setCreated({
        title: data.title ?? title,
        shareUrl: data.shareUrl ?? "",
        absoluteShareUrl: data.absoluteShareUrl ?? "",
        questionCount: data.questionCount ?? filledQuestions.length,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save interview.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!created?.absoluteShareUrl) {
      return;
    }

    await navigator.clipboard.writeText(created.absoluteShareUrl);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
          Interview setup
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Create a voice interview in minutes.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Define the role, generate or edit the question set, then publish a
          shareable candidate link.
        </p>

        <div className="mt-8 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Topic</span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Difficulty</span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as InterviewDifficulty)
              }
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateQuestions}
            disabled={loading}
            className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate questions"}
          </button>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30"
          >
            Add manual question
          </button>
        </div>

        <div className="mt-8 space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                    Question {index + 1}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {question.source === "ai" ? "AI generated" : "Manual"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={question.prompt}
                onChange={(event) =>
                  updateQuestion(question.id, { prompt: event.target.value })
                }
                rows={3}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select
                  value={question.difficulty}
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      difficulty: event.target.value as InterviewDifficulty,
                    })
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  value={question.rationale ?? ""}
                  onChange={(event) =>
                    updateQuestion(question.id, { rationale: event.target.value })
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
                  placeholder="Optional rationale"
                />
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={saveInterview}
          disabled={loading || filledQuestions.length < 3}
          className="mt-8 w-full rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Publish interview"}
        </button>
      </div>

      <div className="space-y-6">
        <div className="surface-card rounded-[2rem] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
            Publishing preview
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>Title: {title}</p>
            <p>Topic: {topic}</p>
            <p>Difficulty: {difficulty}</p>
            <p>Questions ready: {filledQuestions.length}</p>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
            Candidate flow
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>1. Candidate opens share link and enters name plus email.</li>
            <li>2. App requests microphone permission only.</li>
            <li>3. AI speaks, listens, saves the answer, and advances automatically.</li>
            <li>4. Final evaluation is stored for the dashboard.</li>
          </ul>
        </div>

        {created ? (
          <div className="glass-panel rounded-[2rem] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-200">
              Published
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              {created.title}
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              {created.questionCount} questions published.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-200">
              {created.absoluteShareUrl || created.shareUrl}
            </div>
            <button
              type="button"
              onClick={copyShareLink}
              className="mt-4 rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30"
            >
              Copy share link
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
