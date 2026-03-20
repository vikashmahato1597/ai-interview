import { NextResponse } from "next/server";

const TOKEN_TTL_MS = 9 * 60 * 1000;

let cachedToken:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY?.trim() ?? "";
  const region = process.env.AZURE_SPEECH_REGION?.trim() ?? "";
  const voiceName =
    process.env.NEXT_PUBLIC_AZURE_SPEECH_VOICE_NAME?.trim() ??
    "en-US-AvaMultilingualNeural";

  if (!key || !region) {
    return NextResponse.json(
      {
        error: "Azure Speech is not configured.",
      },
      { status: 500 },
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return NextResponse.json({
      token: cachedToken.token,
      region,
      voiceName,
      expiresAt: cachedToken.expiresAt,
    });
  }

  try {
    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Ocp-Apim-Subscription-Key": key,
        },
        body: "",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const message = await response.text();

      throw new Error(message || "Unable to issue Azure Speech token.");
    }

    const token = await response.text();
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    cachedToken = {
      token,
      expiresAt,
    };

    return NextResponse.json({
      token,
      region,
      voiceName,
      expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to issue Azure Speech token.",
      },
      { status: 500 },
    );
  }
}
