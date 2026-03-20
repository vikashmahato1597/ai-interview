import type {
  CreateInterviewRequest,
  EvaluationResult,
} from "@/lib/interview/schemas";

export type UserRole = "interviewer" | "candidate";
export type InterviewDifficulty = "easy" | "medium" | "hard";
export type QuestionSource = "manual" | "ai" | "follow_up";
export type CandidateStatus = "invited" | "in_progress" | "completed";

export interface InterviewQuestion {
  id: string;
  interviewId: string;
  orderIndex: number;
  prompt: string;
  difficulty: InterviewDifficulty;
  source: QuestionSource;
  rationale?: string | null;
}

export interface PublicInterview {
  id: string;
  interviewerId: string;
  slug: string;
  title: string;
  topic: string;
  difficulty: InterviewDifficulty;
  questionCount: number;
}

export interface CandidateAnswerSnapshot {
  question: string;
  answer: string;
  questionId: string | null;
  sequenceNo: number;
  source: "base" | "follow_up";
  recordedAt: string;
}

export interface CandidateSessionState {
  currentQuestionIndex: number;
  currentQuestionId: string | null;
  currentQuestionText: string;
  followUpDepth: number;
  askedQuestions: string[];
  previousAnswers: CandidateAnswerSnapshot[];
  completed: boolean;
  difficulty: InterviewDifficulty;
  startedAt: string;
}

export interface CandidateResponseRecord {
  id: string;
  candidateId: string;
  interviewId: string;
  questionId: string | null;
  askedQuestion: string;
  answerText: string;
  isFollowUp: boolean;
  sequenceNo: number;
}

export interface NextQuestionDecision {
  action: "follow_up" | "next_question" | "complete";
  question: string;
  reason: string;
  updatedDifficulty: InterviewDifficulty;
}

export interface EvaluationContext {
  interview: PublicInterview;
  candidateName: string;
  candidateEmail: string;
  responses: CandidateResponseRecord[];
}

export interface CandidateSessionContext {
  candidate: {
    id: string;
    name: string;
    email: string;
    interviewId: string;
    status: CandidateStatus;
    startedAt: string | null;
    completedAt: string | null;
  };
  interview: PublicInterview;
  questions: InterviewQuestion[];
  state: CandidateSessionState;
  responses: CandidateResponseRecord[];
  result: EvaluationResult | null;
}

export interface DashboardCandidate {
  id: string;
  name: string;
  email: string;
  status: CandidateStatus;
  startedAt: string | null;
  completedAt: string | null;
  score: EvaluationResult | null;
  responses: Array<{
    askedQuestion: string;
    answerText: string;
    isFollowUp: boolean;
  }>;
}

export interface DashboardInterview {
  id: string;
  slug: string;
  title: string;
  topic: string;
  difficulty: InterviewDifficulty;
  createdAt: string | null;
  questionCount: number;
  shareUrl: string;
  candidates: DashboardCandidate[];
}

export type InterviewCreationPayload = CreateInterviewRequest;
