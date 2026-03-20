import { NextResponse } from "next/server";
import { recordCandidateAnswer } from "@/lib/interview/repository";
import { submitAnswerRequestSchema } from "@/lib/interview/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = submitAnswerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid answer payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    await recordCandidateAnswer(parsed.data);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to store the candidate answer.",
      },
      { status: 500 },
    );
  }
}
