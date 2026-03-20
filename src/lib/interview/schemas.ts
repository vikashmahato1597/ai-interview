import { z } from "zod";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const userRoleSchema = z.enum(["interviewer", "candidate"]);
export const questionSourceSchema = z.enum(["manual", "ai", "follow_up"]);

export const generatedQuestionSchema = z.object({
  prompt: z.string().min(10).max(300),
  rationale: z.string().min(6).max(220).optional().default(""),
  difficulty: difficultySchema,
});

export const generatedQuestionsSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(10),
});

export const nextQuestionDecisionSchema = z.object({
  action: z.enum(["follow_up", "next_question", "complete"]),
  question: z.string().max(300).optional().default(""),
  reason: z.string().min(6).max(240),
  updatedDifficulty: difficultySchema,
});

export const evaluationResultSchema = z.object({
  technical: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  confidence: z.number().min(0).max(10),
  overall: z.number().min(0).max(10),
  feedback: z.string().min(20).max(600),
});

export const generateQuestionsRequestSchema = z.object({
  title: z.string().min(3).max(120),
  topic: z.string().min(2).max(120),
  difficulty: difficultySchema,
  count: z.number().int().min(3).max(8).default(5),
});

export const createInterviewQuestionInputSchema = z.object({
  prompt: z.string().min(10).max(300),
  source: z.enum(["manual", "ai"]).default("manual"),
  rationale: z.string().max(220).optional().nullable(),
  difficulty: difficultySchema.optional(),
});

export const createInterviewRequestSchema = z.object({
  title: z.string().min(3).max(120),
  topic: z.string().min(2).max(120),
  difficulty: difficultySchema,
  questions: z.array(createInterviewQuestionInputSchema).min(3).max(10),
});

export const startInterviewRequestSchema = z.object({
  interviewSlug: z.string().min(3).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
});

export const submitAnswerRequestSchema = z.object({
  candidateId: z.string().uuid(),
  answerText: z.string().min(1).max(8000),
  answerDurationSeconds: z.number().int().min(0).max(900).optional().default(0),
  transcriptMeta: z.record(z.string(), z.unknown()).optional().default({}),
});

export const nextQuestionRequestSchema = z.object({
  candidateId: z.string().uuid(),
});

export const evaluateRequestSchema = z.object({
  candidateId: z.string().uuid(),
});

export const endInterviewRequestSchema = z.object({
  candidateId: z.string().uuid(),
});

export type CreateInterviewRequest = z.infer<typeof createInterviewRequestSchema>;
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
