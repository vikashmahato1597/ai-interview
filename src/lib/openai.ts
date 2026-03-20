import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getAzureOpenAIConfig } from "@/lib/env";

let cachedClient: OpenAI | null = null;
let cachedBaseURL = "";
let cachedApiKey = "";

function getClient() {
  const config = getAzureOpenAIConfig();

  if (!config) {
    return null;
  }

  if (
    !cachedClient ||
    cachedBaseURL !== config.baseURL ||
    cachedApiKey !== config.apiKey
  ) {
    cachedClient = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    cachedBaseURL = config.baseURL;
    cachedApiKey = config.apiKey;
  }

  return {
    client: cachedClient,
    deployment: config.deployment,
  };
}

export async function requestStructuredResponse<TSchema extends z.ZodTypeAny>({
  schema,
  schemaName,
  instructions,
  input,
}: {
  schema: TSchema;
  schemaName: string;
  instructions: string;
  input: string;
}) {
  const runtime = getClient();

  if (!runtime) {
    throw new Error(
      "Azure OpenAI is not configured. Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT.",
    );
  }

  try {
    const response = await runtime.client.responses.parse({
      model: runtime.deployment,
      instructions,
      input,
      text: {
        format: zodTextFormat(schema, schemaName),
      },
    });

    return response.output_parsed as z.infer<TSchema> | null;
  } catch (error) {
    console.error("Azure OpenAI request failed.", error);

    if (error instanceof Error) {
      throw new Error(`Azure OpenAI request failed: ${error.message}`);
    }

    throw new Error("Azure OpenAI request failed.");
  }
}
