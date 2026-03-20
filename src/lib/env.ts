import type { VoiceCapabilitySummary, VoiceProvider } from "@/lib/voice/config";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ??
    "";

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

export function getSupabaseAdminConfig() {
  const publicConfig = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!publicConfig || !serviceRoleKey) {
    return null;
  }

  return {
    ...publicConfig,
    serviceRoleKey,
  };
}

export function getAzureOpenAIConfig() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim() ?? "";
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim() ?? "";
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ?? "";

  if (!apiKey || !endpoint || !deployment) {
    return null;
  }

  return {
    apiKey,
    deployment,
    baseURL: `${trimTrailingSlash(endpoint)}/openai/v1/`,
  };
}

function normalizeProvider(
  value: string | undefined,
  fallback: VoiceProvider,
): VoiceProvider {
  if (value === "azure" || value === "retell" || value === "browser") {
    return value;
  }

  return fallback;
}

export function getVoiceCapabilitySummary(): VoiceCapabilitySummary {
  const hasAzureSpeech =
    Boolean(process.env.AZURE_SPEECH_KEY) &&
    Boolean(process.env.AZURE_SPEECH_REGION);
  const hasRetell = Boolean(process.env.RETELL_API_KEY);

  return {
    ttsProvider: normalizeProvider(
      process.env.NEXT_PUBLIC_TTS_PROVIDER,
      hasRetell ? "retell" : hasAzureSpeech ? "azure" : "browser",
    ),
    sttProvider: normalizeProvider(
      process.env.NEXT_PUBLIC_STT_PROVIDER,
      hasAzureSpeech ? "azure" : "browser",
    ),
    hasAzureSpeech,
    hasRetell,
  };
}
