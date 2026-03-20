import { NextResponse } from "next/server";
import { getVoiceCapabilitySummary } from "@/lib/env";
import {
  advanceCandidateSession,
  getCandidateSessionContext,
  saveInterviewResult,
} from "@/lib/interview/repository";
import { decideNextQuestion, evaluateInterview } from "@/lib/interview/engine";
import { nextQuestionRequestSchema } from "@/lib/interview/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = nextQuestionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid next question payload.",
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

    if (context.result) {
      return NextResponse.json({
        complete: true,
        result: context.result,
        voice: getVoiceCapabilitySummary(),
      });
    }

    const latestAnswer = context.responses.at(-1);

    if (!latestAnswer) {
      return NextResponse.json(
        {
          error: "No answer has been submitted yet for this session.",
        },
        { status: 400 },
      );
    }

    const decision = await decideNextQuestion({
      interview: context.interview,
      questions: context.questions,
      state: context.state,
      latestAnswer,
    });

    const nextStep = await advanceCandidateSession({
      candidateId: parsed.data.candidateId,
      decision,
    });

    if (nextStep.complete) {
      const evaluation = await evaluateInterview({
        interview: context.interview,
        candidateName: context.candidate.name,
        candidateEmail: context.candidate.email,
        responses: context.responses,
      });
      const savedResult = await saveInterviewResult(
        context.candidate.id,
        context.interview.id,
        evaluation,
      );

      return NextResponse.json({
        complete: true,
        result: savedResult,
        voice: getVoiceCapabilitySummary(),
      });
    }

    return NextResponse.json({
      complete: false,
      question: nextStep.question,
      voice: getVoiceCapabilitySummary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to determine the next interview question.",
      },
      { status: 500 },
    );
  }
}
