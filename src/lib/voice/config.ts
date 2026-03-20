export type VoiceProvider = "browser" | "azure" | "retell";

export interface VoiceCapabilitySummary {
  ttsProvider: VoiceProvider;
  sttProvider: VoiceProvider;
  hasAzureSpeech: boolean;
  hasRetell: boolean;
}
