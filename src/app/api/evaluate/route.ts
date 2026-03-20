import { NextResponse } from "next/server";
import { evaluateInterview } from "@/lib/interview/engine";
import {
  getCandidateSessionContext,
  saveInterviewResult,
} from "@/lib/interview/repository";
import { evaluateRequestSchema } from "@/lib/interview/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = evaluateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid evaluation payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const context = await getCandidateSessionContext(parsed.data.candidateId);

    if (!context) {
      return NextResponse.json(
        {
          error: "Candidate session was not found.",
        },
        { status: 404 },
      );
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
            : "Unable to evaluate the interview.",
      },
      { status: 500 },
    );
  }
}
