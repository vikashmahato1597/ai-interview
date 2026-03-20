"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createAzureSpeechRecognizer } from "@/lib/voice/azure";
import type { VoiceProvider } from "@/lib/voice/config";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getBrowserSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition({
  provider,
  silenceMs = 1800,
  onFinalTranscript,
  onSilence,
  onError,
}: {
  provider: VoiceProvider;
  silenceMs?: number;
  onFinalTranscript: (value: string) => void;
  onSilence?: () => void;
  onError?: (message: string) => void;
}) {
  const browserRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const azureRecognizerRef = useRef<{
    stop: () => Promise<void>;
    close: () => void;
  } | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const shouldFinalizeRef = useRef(true);
  const isFinalizingRef = useRef(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const emitFinalTranscript = useEffectEvent((value: string) => {
    onFinalTranscript(value);
  });

  const emitSilence = useEffectEvent(() => {
    onSilence?.();
  });

  const emitError = useEffectEvent((message: string) => {
    onError?.(message);
  });

  useEffect(() => {
    if (provider === "azure") {
      setIsSupported(typeof window !== "undefined");
      return;
    }

    setIsSupported(Boolean(getBrowserSpeechRecognitionConstructor()));
  }, [provider]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const scheduleSilenceTimer = () => {
    clearSilenceTimer();

    silenceTimerRef.current = window.setTimeout(() => {
      void stopListening();
    }, silenceMs);
  };

  const resetTranscript = () => {
    transcriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
  };

  const finalizeRecognition = useEffectEvent(() => {
    if (isFinalizingRef.current) {
      return;
    }

    isFinalizingRef.current = true;
    setIsListening(false);
    clearSilenceTimer();

    if (!shouldFinalizeRef.current) {
      return;
    }

    const finalText = transcriptRef.current.trim();

    if (finalText) {
      emitFinalTranscript(finalText);
      return;
    }

    emitSilence();
  });

  const buildBrowserRecognition = () => {
    if (browserRecognitionRef.current) {
      return browserRecognitionRef.current;
    }

    const SpeechRecognition = getBrowserSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      let finalText = transcriptRef.current;
      let nextInterim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const segment = result[0]?.transcript?.trim() ?? "";

        if (!segment) {
          continue;
        }

        if (result.isFinal) {
          finalText = `${finalText} ${segment}`.trim();
        } else {
          nextInterim = `${nextInterim} ${segment}`.trim();
        }
      }

      transcriptRef.current = finalText;
      setTranscript(finalText);
      setInterimTranscript(nextInterim);
      scheduleSilenceTimer();
    };
    recognition.onerror = (event) => {
      shouldFinalizeRef.current = false;
      setIsListening(false);
      clearSilenceTimer();
      emitError(`Microphone error: ${event.error}.`);
    };
    recognition.onend = () => {
      finalizeRecognition();
    };

    browserRecognitionRef.current = recognition;
    return recognition;
  };

  const startBrowserListening = async () => {
    const recognition = buildBrowserRecognition();

    if (!recognition) {
      emitError(
        "This browser does not support speech recognition. Use Azure Speech or a Chromium-based browser.",
      );
      return false;
    }

    try {
      recognition.start();
      scheduleSilenceTimer();
      return true;
    } catch {
      emitError("Microphone could not start. Try again.");
      return false;
    }
  };

  const startAzureListening = async () => {
    try {
      const recognizer = await createAzureSpeechRecognizer({
        onInterim: (value) => {
          setInterimTranscript(value);
          scheduleSilenceTimer();
        },
        onFinal: (value) => {
          transcriptRef.current = value;
          setTranscript(value);
          setInterimTranscript("");
          scheduleSilenceTimer();
        },
        onError: (message) => {
          shouldFinalizeRef.current = false;
          emitError(message);
          setIsListening(false);
          clearSilenceTimer();
        },
      });

      azureRecognizerRef.current = recognizer;
      setIsListening(true);
      scheduleSilenceTimer();
      return true;
    } catch (error) {
      emitError(
        error instanceof Error
          ? error.message
          : "Unable to start Azure Speech recognition.",
      );
      return false;
    }
  };

  const startListening = async () => {
    shouldFinalizeRef.current = true;
    isFinalizingRef.current = false;
    resetTranscript();

    if (provider === "azure") {
      const azureStarted = await startAzureListening();

      if (azureStarted) {
        return true;
      }

      return startBrowserListening();
    }

    return startBrowserListening();
  };

  const stopListening = async () => {
    clearSilenceTimer();

    if (provider === "azure" && azureRecognizerRef.current) {
      const recognizer = azureRecognizerRef.current;
      azureRecognizerRef.current = null;
      await recognizer.stop();
      finalizeRecognition();
      return;
    }

    browserRecognitionRef.current?.stop();
  };

  const cancelListening = async () => {
    shouldFinalizeRef.current = false;
    clearSilenceTimer();
    setIsListening(false);
    setInterimTranscript("");

    if (provider === "azure" && azureRecognizerRef.current) {
      const recognizer = azureRecognizerRef.current;
      azureRecognizerRef.current = null;
      recognizer.close();
      return;
    }

    browserRecognitionRef.current?.abort();
  };

  useEffect(() => {
    return () => {
      shouldFinalizeRef.current = false;
      clearSilenceTimer();
      browserRecognitionRef.current?.abort();
      azureRecognizerRef.current?.close();
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  };
}
