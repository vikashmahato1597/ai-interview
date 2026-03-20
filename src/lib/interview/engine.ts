import {
  generatedQuestionsSchema,
  evaluationResultSchema,
  type EvaluationResult,
  nextQuestionDecisionSchema,
} from "@/lib/interview/schemas";
import type {
  CandidateResponseRecord,
  CandidateSessionState,
  EvaluationContext,
  InterviewDifficulty,
  InterviewQuestion,
  NextQuestionDecision,
  PublicInterview,
} from "@/lib/interview/types";
import { requestStructuredResponse } from "@/lib/openai";
import {
  buildEvaluationPrompt,
  buildNextQuestionPrompt,
  buildQuestionGenerationPrompt,
  EVALUATION_SYSTEM_PROMPT,
  NEXT_QUESTION_SYSTEM_PROMPT,
  QUESTION_GENERATION_SYSTEM_PROMPT,
} from "@/lib/prompts";
import { average, clamp, wordCount } from "@/lib/utils";

const FALLBACK_QUESTION_BANK: Record<InterviewDifficulty, string[]> = {
  easy: [
    "Describe the core responsibilities of a strong {topic} solution in production.",
    "What trade-offs would you consider first when designing a basic {topic} workflow?",
    "How would you test a small but critical {topic} feature before release?",
    "What signals tell you a {topic} implementation is healthy in production?",
    "Explain a common mistake teams make with {topic} and how you avoid it.",
  ],
  medium: [
    "How would you design a scalable {topic} service for growing traffic and changing requirements?",
    "What bottlenecks do you expect in a real-world {topic} system, and how would you mitigate them?",
    "Explain how you would structure observability, retries, and failure handling for {topic}.",
    "How would you break down the architecture for a maintainable {topic} platform owned by multiple teams?",
    "Which trade-offs would you accept between speed, reliability, and cost in a {topic} system?",
  ],
  hard: [
    "Design a resilient {topic} platform that can scale globally while preserving low latency and data integrity.",
    "How would you reason about consistency, fault isolation, and rollback strategy in a complex {topic} architecture?",
    "Walk through the highest-risk failure modes in a large-scale {topic} system and how you would defend against them.",
    "How would you evolve a legacy {topic} implementation into a modern platform without disrupting users?",
    "What technical and organizational constraints most affect a high-stakes {topic} redesign?",
  ],
};

const MAX_FOLLOW_UPS_PER_QUESTION = 1;

function stepDifficulty(
  current: InterviewDifficulty,
  direction: "up" | "down" | "stay",
): InterviewDifficulty {
  const ladder: InterviewDifficulty[] = ["easy", "medium", "hard"];
  const currentIndex = ladder.indexOf(current);

  if (direction === "stay") {
    return current;
  }

  if (direction === "up") {
    return ladder[Math.min(currentIndex + 1, ladder.length - 1)];
  }

  return ladder[Math.max(currentIndex - 1, 0)];
}

function deriveDifficultyFromAnswer(
  state: CandidateSessionState,
  answerText: string,
): InterviewDifficulty {
  const count = wordCount(answerText);

  if (count >= 90) {
    return stepDifficulty(state.difficulty, "up");
  }

  if (count <= 18) {
    return stepDifficulty(state.difficulty, "down");
  }

  return state.difficulty;
}

export async function generateInterviewQuestions(input: {
  title: string;
  topic: string;
  difficulty: InterviewDifficulty;
  count: number;
}): Promise<
  Array<{
    prompt: string;
    source: "ai";
    rationale: string;
    difficulty: InterviewDifficulty;
  }>
> {
  const aiOutput = await requestStructuredResponse({
    schema: generatedQuestionsSchema,
    schemaName: "interview_question_batch",
    instructions: QUESTION_GENERATION_SYSTEM_PROMPT,
    input: buildQuestionGenerationPrompt(input),
  });

  if (!aiOutput?.questions?.length) {
    throw new Error(
      "Azure OpenAI returned no interview questions for this request.",
    );
  }

  return aiOutput.questions.map((question) => ({
    prompt: question.prompt,
    source: "ai" as const,
    rationale: question.rationale,
    difficulty: question.difficulty,
  }));
}

function buildFallbackDecision(input: {
  questions: InterviewQuestion[];
  state: CandidateSessionState;
  latestAnswer: CandidateResponseRecord;
}): NextQuestionDecision {
  const updatedDifficulty = deriveDifficultyFromAnswer(
    input.state,
    input.latestAnswer.answerText,
  );
  const nextBaseQuestion =
    input.questions[input.state.currentQuestionIndex + 1] ?? null;
  const shouldFollowUp =
    input.state.followUpDepth < MAX_FOLLOW_UPS_PER_QUESTION &&
    wordCount(input.latestAnswer.answerText) < 28;

  if (shouldFollowUp) {
    return {
      action: "follow_up",
      question:
        "Can you expand on that with a concrete example, trade-off, or implementation detail?",
      reason:
        "The latest answer was brief, so a targeted follow-up is more useful than moving on.",
      updatedDifficulty,
    };
  }

  if (nextBaseQuestion) {
    return {
      action: "next_question",
      question: nextBaseQuestion.prompt,
      reason: "The answer was sufficient to move to the next planned question.",
      updatedDifficulty,
    };
  }

  return {
    action: "complete",
    question: "",
    reason: "The planned interview has no remaining base questions.",
    updatedDifficulty,
  };
}

export async function decideNextQuestion(input: {
  interview: PublicInterview;
  questions: InterviewQuestion[];
  state: CandidateSessionState;
  latestAnswer: CandidateResponseRecord;
}): Promise<NextQuestionDecision> {
  const fallback = buildFallbackDecision(input);
  let aiOutput: Awaited<
    ReturnType<typeof requestStructuredResponse<typeof nextQuestionDecisionSchema>>
  > | null = null;

  try {
    aiOutput = await requestStructuredResponse({
      schema: nextQuestionDecisionSchema,
      schemaName: "next_interview_step",
      instructions: NEXT_QUESTION_SYSTEM_PROMPT,
      input: buildNextQuestionPrompt({
        interview: input.interview,
        questions: input.questions,
        state: input.state,
        latestAnswer: {
          question: input.latestAnswer.askedQuestion,
          answer: input.latestAnswer.answerText,
          isFollowUp: input.latestAnswer.isFollowUp,
        },
      }),
    });
  } catch {
    aiOutput = null;
  }

  if (!aiOutput) {
    return fallback;
  }

  if (
    aiOutput.action === "follow_up" &&
    input.state.followUpDepth >= MAX_FOLLOW_UPS_PER_QUESTION
  ) {
    return fallback;
  }

  if (
    aiOutput.action === "next_question" &&
    !input.questions[input.state.currentQuestionIndex + 1]
  ) {
    return {
      ...fallback,
      action: "complete",
      question: "",
      reason: "No planned question remains after the last answer.",
    };
  }

  return aiOutput;
}

function buildFallbackEvaluation(context: EvaluationContext): EvaluationResult {
  const lengths = context.responses.map((response) => wordCount(response.answerText));
  const averageLength = average(lengths);
  const completedQuestions = context.responses.length;
  const technical = clamp(4 + completedQuestions * 0.6 + averageLength / 35, 0, 10);
  const communication = clamp(4 + averageLength / 28, 0, 10);
  const confidence = clamp(
    4 +
      context.responses.filter(
        (response) =>
          !response.answerText.toLowerCase().includes("not sure") &&
          !response.answerText.toLowerCase().includes("i don't know"),
      ).length *
        0.8,
    0,
    10,
  );
  const overall = clamp(
    Number(((technical + communication + confidence) / 3).toFixed(1)),
    0,
    10,
  );

  return {
    technical: Number(technical.toFixed(1)),
    communication: Number(communication.toFixed(1)),
    confidence: Number(confidence.toFixed(1)),
    overall,
    feedback:
      "The candidate completed the interview with enough material for a baseline assessment. Review the transcript for depth on systems reasoning and concrete implementation trade-offs before making a hiring decision.",
  };
}

export async function evaluateInterview(
  context: EvaluationContext,
): Promise<EvaluationResult> {
  let aiOutput: Awaited<
    ReturnType<typeof requestStructuredResponse<typeof evaluationResultSchema>>
  > | null = null;

  try {
    aiOutput = await requestStructuredResponse({
      schema: evaluationResultSchema,
      schemaName: "interview_evaluation",
      instructions: EVALUATION_SYSTEM_PROMPT,
      input: buildEvaluationPrompt(context),
    });
  } catch {
    aiOutput = null;
  }

  return aiOutput ?? buildFallbackEvaluation(context);
}
