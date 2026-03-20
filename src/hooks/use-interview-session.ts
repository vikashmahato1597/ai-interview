"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { EvaluationResult } from "@/lib/interview/schemas";
import type { InterviewDifficulty } from "@/lib/interview/types";
import { speakWithBrowser, stopBrowserSpeech } from "@/lib/voice/browser";
import { speakWithAzure, stopAzureSpeech } from "@/lib/voice/azure";
import type { VoiceCapabilitySummary, VoiceProvider } from "@/lib/voice/config";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

type InterviewPhase =
  | "idle"
  | "preparing"
  | "speaking"
  | "listening"
  | "processing"
  | "finished"
  | "error";

interface InterviewQuestionState {
  text: string;
  sequence: number;
  total: number;
  source: "base" | "follow_up";
}

interface InterviewMetaState {
  title: string;
  topic: string;
  difficulty: InterviewDifficulty;
  questionCount: number;
}

const DEFAULT_VOICE_SUMMARY: VoiceCapabilitySummary = {
  ttsProvider: "browser",
  sttProvider: "browser",
  hasAzureSpeech: false,
  hasRetell: false,
};

async function readJson<TResponse>(response: Response): Promise<TResponse> {
  const data = (await response.json()) as TResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

async function requestMicPermission() {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error("Microphone access is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  stream.getTracks().forEach((track) => track.stop());
}

export function useInterviewSession({
  interviewSlug,
  initialInterview,
  answerTimeLimitSeconds = 90,
}: {
  interviewSlug: string;
  initialInterview?: Partial<InterviewMetaState>;
  answerTimeLimitSeconds?: number;
}) {
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activityLabel, setActivityLabel] = useState("Ready to begin.");
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [question, setQuestion] = useState<InterviewQuestionState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(answerTimeLimitSeconds);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [voiceSummary, setVoiceSummary] =
    useState<VoiceCapabilitySummary>(DEFAULT_VOICE_SUMMARY);
  const [interviewMeta, setInterviewMeta] = useState<InterviewMetaState>({
    title: initialInterview?.title ?? "AI Interview",
    topic: initialInterview?.topic ?? "General",
    difficulty: initialInterview?.difficulty ?? "medium",
    questionCount: initialInterview?.questionCount ?? 0,
  });
  const submitGuardRef = useRef(false);
  const micRetryRef = useRef(0);
  const endRequestedRef = useRef(false);
  const [isEnding, setIsEnding] = useState(false);

  const submitAnswer = useEffectEvent(async (answerText: string) => {
    if (!candidateId || submitGuardRef.current || endRequestedRef.current) {
      return;
    }

    submitGuardRef.current = true;
    setPhase("processing");
    setActivityLabel("Reviewing your answer...");

    try {
      await readJson<{ ok: boolean }>(
        await fetch("/api/submit-answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidateId,
            answerText,
            answerDurationSeconds: answerTimeLimitSeconds - remainingSeconds,
            transcriptMeta: {
              source: "web-speech-api",
            },
          }),
        }),
      );

      const nextStep = await readJson<
        | {
            complete: false;
            question: InterviewQuestionState;
            voice: VoiceCapabilitySummary;
          }
        | {
            complete: true;
            result: EvaluationResult;
            voice: VoiceCapabilitySummary;
          }
      >(
        await fetch("/api/next-question", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidateId,
          }),
        }),
      );

      setVoiceSummary(nextStep.voice);

      if (nextStep.complete) {
        setResult(nextStep.result);
        setPhase("finished");
        setActivityLabel("Interview complete.");
        stopBrowserSpeech();
        return;
      }

      setQuestion(nextStep.question);
      await speakQuestion(nextStep.question.text, nextStep.voice.ttsProvider);
    } catch (submissionError) {
      setPhase("error");
      setActivityLabel("The interview hit an error.");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to continue the interview.",
      );
    } finally {
      submitGuardRef.current = false;
    }
  });

  const onSpeechRecognitionError = useEffectEvent((message: string) => {
    if (endRequestedRef.current) {
      return;
    }

    if (micRetryRef.current < 1) {
      micRetryRef.current += 1;
      setActivityLabel("Retrying microphone...");
      window.setTimeout(() => {
        void beginListening();
      }, 700);
      return;
    }

    setError(message);
    setPhase("error");
    setActivityLabel("Microphone unavailable.");
  });

  const speech = useSpeechRecognition({
    provider: voiceSummary.sttProvider,
    onFinalTranscript: (value) => {
      void submitAnswer(value);
    },
    onSilence: () => {
      void submitAnswer("No verbal response captured.");
    },
    onError: onSpeechRecognitionError,
  });

  const beginListening = useEffectEvent(async () => {
    if (endRequestedRef.current) {
      return;
    }

    setRemainingSeconds(answerTimeLimitSeconds);
    setPhase("listening");
    setActivityLabel("Listening...");
    const started = await speech.startListening();

    if (started) {
      micRetryRef.current = 0;
    }
  });

  const speakText = useEffectEvent(
    async (text: string, provider: VoiceProvider) => {
      if (provider === "azure") {
        try {
          await speakWithAzure(text);
          return;
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Azure speech synthesis failed. Falling back to browser speech.",
          );
        }
      }

      await speakWithBrowser(text, {
        onError: (message) => {
          setError(message);
        },
      });
    },
  );

  const speakQuestion = useEffectEvent(async (text: string, provider?: VoiceProvider) => {
    if (endRequestedRef.current) {
      return;
    }

    speech.resetTranscript();
    setPhase("speaking");
    setActivityLabel("AI is speaking...");
    await speakText(text, provider ?? voiceSummary.ttsProvider);

    if (endRequestedRef.current) {
      return;
    }

    await beginListening();
  });

  useEffect(() => {
    if (phase !== "listening") {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          speech.stopListening();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [phase, speech]);

  useEffect(() => {
    return () => {
      stopBrowserSpeech();
      stopAzureSpeech();
    };
  }, []);

  const startInterview = async (profile: { name: string; email: string }) => {
    endRequestedRef.current = false;
    setIsEnding(false);
    setError(null);
    setPhase("preparing");
    setActivityLabel("Preparing interview...");

    try {
      await requestMicPermission();

      const data = await readJson<{
        candidateId: string;
        interview: InterviewMetaState;
        question: InterviewQuestionState;
        voice: VoiceCapabilitySummary;
      }>(
        await fetch("/api/start-interview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interviewSlug,
            name: profile.name,
            email: profile.email,
          }),
        }),
      );

      setCandidateId(data.candidateId);
      setInterviewMeta(data.interview);
      setQuestion(data.question);
      setVoiceSummary(data.voice);
      await speakQuestion(data.question.text, data.voice.ttsProvider);
    } catch (startError) {
      setPhase("error");
      setActivityLabel("The interview could not start.");
      setError(
        startError instanceof Error
          ? startError.message
          : "Unable to start the interview.",
      );
    }
  };

  const endInterview = async () => {
    if (!candidateId || isEnding) {
      return;
    }

    endRequestedRef.current = true;
    setIsEnding(true);
    setError(null);
    setPhase("processing");
    setActivityLabel("Ending interview...");
    stopBrowserSpeech();
    stopAzureSpeech();

    try {
      await speech.cancelListening();

      const data = await readJson<{
        result: EvaluationResult;
      }>(
        await fetch("/api/end-interview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidateId,
          }),
        }),
      );

      setQuestion(null);
      setResult(data.result);
      setPhase("finished");
      setActivityLabel("Interview ended.");
    } catch (endError) {
      endRequestedRef.current = false;
      setIsEnding(false);
      setPhase("error");
      setActivityLabel("Unable to end the interview.");
      setError(
        endError instanceof Error
          ? endError.message
          : "Unable to end the interview.",
      );
    }
  };

  const retryListening = async () => {
    setError(null);
    await beginListening();
  };

  return {
    phase,
    error,
    activityLabel,
    candidateId,
    question,
    remainingSeconds,
    answerTimeLimitSeconds,
    result,
    voiceSummary,
    interviewMeta,
    hasStarted: Boolean(candidateId),
    transcript: speech.transcript,
    interimTranscript: speech.interimTranscript,
    isSpeechRecognitionSupported: speech.isSupported,
    isEnding,
    startInterview,
    endInterview,
    retryListening,
    stopListening: speech.stopListening,
  };
}
