import { NextResponse } from "next/server";
import { generateInterviewQuestions } from "@/lib/interview/engine";
import { generateQuestionsRequestSchema } from "@/lib/interview/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateQuestionsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid question generation payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const questions = await generateInterviewQuestions(parsed.data);

    return NextResponse.json({
      questions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate interview questions.",
      },
      { status: 500 },
    );
  }
}
