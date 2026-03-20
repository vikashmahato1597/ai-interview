import { NextResponse } from "next/server";
import { evaluateInterview } from "@/lib/interview/engine";
import {
  completeCandidateSession,
  saveInterviewResult,
} from "@/lib/interview/repository";
import { endInterviewRequestSchema } from "@/lib/interview/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = endInterviewRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid end interview payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const context = await completeCandidateSession(parsed.data.candidateId);

    if (context.result) {
      return NextResponse.json({
        result: context.result,
      });
    }

    const evaluation = await evaluateInterview({
      interview: context.interview,
      candidateName: context.candidate.name,
      candidateEmail: context.candidate.email,
      responses: context.responses,
    });
    const result = await saveInterviewResult(
      context.candidate.id,
      context.interview.id,
      evaluation,
    );

    return NextResponse.json({
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to end the interview.",
      },
      { status: 500 },
    );
  }
}
