export function canUseSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopBrowserSpeech() {
  if (!canUseSpeechSynthesis()) {
    return;
  }

  window.speechSynthesis.cancel();
}

export function speakWithBrowser(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (message: string) => void;
  },
) {
  if (!canUseSpeechSynthesis()) {
    callbacks?.onError?.("Speech synthesis is not available in this browser.");
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => callbacks?.onStart?.();
    utterance.onend = () => {
      callbacks?.onEnd?.();
      resolve();
    };
    utterance.onerror = () => {
      callbacks?.onError?.(
        "Speech synthesis failed, falling back to text-only prompts.",
      );
      resolve();
    };

    stopBrowserSpeech();
    window.speechSynthesis.speak(utterance);
  });
}
