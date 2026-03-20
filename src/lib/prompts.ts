import type {
  CandidateSessionState,
  EvaluationContext,
  InterviewDifficulty,
  InterviewQuestion,
  PublicInterview,
} from "@/lib/interview/types";

export const QUESTION_GENERATION_SYSTEM_PROMPT = `
You create concise, high-signal technical interview questions.
Return JSON only.
Keep questions realistic for live voice interviews.
Ask one concept per question.
Do not include answers.
Balance breadth and depth across the requested count.
`.trim();

export const NEXT_QUESTION_SYSTEM_PROMPT = `
You are the AI interviewer inside a live voice interview.
Return JSON only.
Rules:
- Ask exactly one question at a time.
- Prefer a follow-up if the latest answer is vague, shallow, or missing depth.
- Otherwise move to the next planned base question.
- Only mark complete when the interview has exhausted the planned questions and no follow-up is needed.
- Keep follow-up questions short, natural, and specific to the last answer.
- Adapt difficulty based on demonstrated confidence and technical depth.
`.trim();

export const EVALUATION_SYSTEM_PROMPT = `
You are evaluating a candidate after a completed technical interview.
Return strict JSON only.
Score each category from 0 to 10.
Base scores only on the provided transcript and interview context.
Feedback must be direct, balanced, and actionable in 2 to 4 sentences.
`.trim();

export function buildQuestionGenerationPrompt(input: {
  title: string;
  topic: string;
  difficulty: InterviewDifficulty;
  count: number;
}) {
  return JSON.stringify(
    {
      role: "interviewer_designer",
      interview: input,
      output_requirements: {
        question_count: input.count,
        style: "voice-friendly",
        max_length_each: "30 words",
      },
    },
    null,
    2,
  );
}

export function buildNextQuestionPrompt(input: {
  interview: PublicInterview;
  questions: InterviewQuestion[];
  state: CandidateSessionState;
  latestAnswer: {
    question: string;
    answer: string;
    isFollowUp: boolean;
  };
}) {
  return JSON.stringify(
    {
      interview: {
        title: input.interview.title,
        topic: input.interview.topic,
        difficulty: input.interview.difficulty,
      },
      planned_questions: input.questions.map((question) => ({
        order: question.orderIndex,
        prompt: question.prompt,
        difficulty: question.difficulty,
      })),
      session_state: input.state,
      latest_answer: input.latestAnswer,
      output_contract: {
        action: ["follow_up", "next_question", "complete"],
        updatedDifficulty: ["easy", "medium", "hard"],
      },
    },
    null,
    2,
  );
}

export function buildEvaluationPrompt(context: EvaluationContext) {
  return JSON.stringify(
    {
      interview: {
        title: context.interview.title,
        topic: context.interview.topic,
        difficulty: context.interview.difficulty,
      },
      candidate: {
        name: context.candidateName,
        email: context.candidateEmail,
      },
      answers: context.responses.map((response) => ({
        question: response.askedQuestion,
        answer: response.answerText,
        follow_up: response.isFollowUp,
      })),
      scoring_axes: [
        "technical",
        "communication",
        "confidence",
        "overall",
        "feedback",
      ],
    },
    null,
    2,
  );
}
