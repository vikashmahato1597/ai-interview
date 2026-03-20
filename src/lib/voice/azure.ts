"use client";

let cachedAuth:
  | {
      token: string;
      region: string;
      voiceName: string;
      expiresAt: number;
    }
  | null = null;

let activeSynthesizer:
  | {
      close: () => void;
    }
  | null = null;

async function getSpeechSdk() {
  return import("microsoft-cognitiveservices-speech-sdk");
}

async function getAzureSpeechAuth() {
  if (cachedAuth && cachedAuth.expiresAt > Date.now() + 30_000) {
    return cachedAuth;
  }

  const response = await fetch("/api/speech-token", {
    method: "GET",
    cache: "no-store",
  });
  const data = (await response.json()) as
    | {
        token: string;
        region: string;
        voiceName: string;
        expiresAt: number;
      }
    | {
        error: string;
      };

  if (!response.ok || !("token" in data)) {
    throw new Error(
      "error" in data ? data.error : "Unable to fetch Azure Speech token.",
    );
  }

  cachedAuth = data;
  return data;
}

export function stopAzureSpeech() {
  activeSynthesizer?.close();
  activeSynthesizer = null;
}

export async function speakWithAzure(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  },
) {
  const [sdk, auth] = await Promise.all([getSpeechSdk(), getAzureSpeechAuth()]);
  const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
    auth.token,
    auth.region,
  );
  const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();

  speechConfig.speechSynthesisLanguage = "en-US";
  speechConfig.speechSynthesisVoiceName = auth.voiceName;

  stopAzureSpeech();

  return new Promise<void>((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    activeSynthesizer = synthesizer;
    callbacks?.onStart?.();

    synthesizer.speakTextAsync(
      text,
      () => {
        synthesizer.close();

        if (activeSynthesizer === synthesizer) {
          activeSynthesizer = null;
        }

        callbacks?.onEnd?.();
        resolve();
      },
      (error) => {
        synthesizer.close();

        if (activeSynthesizer === synthesizer) {
          activeSynthesizer = null;
        }

        reject(
          new Error(
            typeof error === "string"
              ? error
              : "Azure speech synthesis failed.",
          ),
        );
      },
    );
  });
}

export async function createAzureSpeechRecognizer({
  onInterim,
  onFinal,
  onError,
}: {
  onInterim: (value: string) => void;
  onFinal: (value: string) => void;
  onError: (message: string) => void;
}) {
  const [sdk, auth] = await Promise.all([getSpeechSdk(), getAzureSpeechAuth()]);
  const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
    auth.token,
    auth.region,
  );
  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

  speechConfig.speechRecognitionLanguage = "en-US";

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  let finalTranscript = "";
  let sessionStoppedResolver: (() => void) | null = null;
  const stopped = new Promise<void>((resolve) => {
    sessionStoppedResolver = resolve;
  });

  recognizer.recognizing = (_, event) => {
    const text = event.result?.text?.trim() ?? "";

    if (text) {
      onInterim(text);
    }
  };

  recognizer.recognized = (_, event) => {
    if (event.result?.reason !== sdk.ResultReason.RecognizedSpeech) {
      return;
    }

    const text = event.result.text?.trim() ?? "";

    if (!text) {
      return;
    }

    finalTranscript = `${finalTranscript} ${text}`.trim();
    onFinal(finalTranscript);
  };

  recognizer.canceled = (_, event) => {
    if (event.errorDetails) {
      onError(event.errorDetails);
    } else {
      onError("Azure Speech recognition was cancelled.");
    }

    recognizer.close();
    sessionStoppedResolver?.();
  };

  recognizer.sessionStopped = () => {
    recognizer.close();
    sessionStoppedResolver?.();
  };

  await new Promise<void>((resolve, reject) => {
    recognizer.startContinuousRecognitionAsync(
      () => resolve(),
      (error) =>
        reject(
          new Error(
            typeof error === "string"
              ? error
              : "Unable to start Azure Speech recognition.",
          ),
        ),
    );
  });

  return {
    stop: async () => {
      await new Promise<void>((resolve) => {
        recognizer.stopContinuousRecognitionAsync(() => resolve(), () => resolve());
      });
      await stopped;
    },
    close: () => {
      recognizer.close();
      sessionStoppedResolver?.();
    },
  };
}
