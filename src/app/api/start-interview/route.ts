import { NextResponse } from "next/server";
import { getVoiceCapabilitySummary } from "@/lib/env";
import { startInterviewSession } from "@/lib/interview/repository";
import { startInterviewRequestSchema } from "@/lib/interview/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = startInterviewRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid start interview payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const session = await startInterviewSession(parsed.data);

    return NextResponse.json({
      ...session,
      voice: getVoiceCapabilitySummary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start the interview.",
      },
      { status: 500 },
    );
  }
}
