import type { User } from "@supabase/supabase-js";
import type { EvaluationResult } from "@/lib/interview/schemas";
import type {
  CandidateSessionContext,
  CandidateSessionState,
  CandidateStatus,
  DashboardInterview,
  InterviewCreationPayload,
  InterviewQuestion,
  NextQuestionDecision,
  PublicInterview,
  UserRole,
} from "@/lib/interview/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateShareSlug } from "@/lib/utils";

function isDifficulty(value: unknown): value is "easy" | "medium" | "hard" {
  return value === "easy" || value === "medium" || value === "hard";
}

function normalizeQuestionRow(row: Record<string, unknown>): InterviewQuestion {
  return {
    id: String(row.id),
    interviewId: String(row.interview_id),
    orderIndex: Number(row.order_index ?? 0),
    prompt: String(row.prompt ?? ""),
    difficulty: isDifficulty(row.difficulty) ? row.difficulty : "medium",
    source:
      row.source === "manual" || row.source === "follow_up" ? row.source : "ai",
    rationale: typeof row.rationale === "string" ? row.rationale : null,
  };
}

function normalizeCandidateState(
  rawState: unknown,
  questions: InterviewQuestion[],
  defaultDifficulty: PublicInterview["difficulty"],
): CandidateSessionState {
  const fallbackQuestion = questions[0];
  const state =
    rawState && typeof rawState === "object"
      ? (rawState as Record<string, unknown>)
      : {};

  const currentQuestionIndex =
    typeof state.currentQuestionIndex === "number" ? state.currentQuestionIndex : 0;
  const baseQuestion = questions[currentQuestionIndex] ?? fallbackQuestion;
  const askedQuestions =
    Array.isArray(state.askedQuestions) && state.askedQuestions.length
      ? state.askedQuestions.filter((item): item is string => typeof item === "string")
      : baseQuestion
        ? [baseQuestion.prompt]
        : [];

  const previousAnswers = Array.isArray(state.previousAnswers)
    ? state.previousAnswers
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const item = entry as Record<string, unknown>;

          return {
            question: String(item.question ?? ""),
            answer: String(item.answer ?? ""),
            questionId:
              typeof item.questionId === "string" ? item.questionId : null,
            sequenceNo: Number(item.sequenceNo ?? 0),
            source: item.source === "follow_up" ? "follow_up" : "base",
            recordedAt:
              typeof item.recordedAt === "string"
                ? item.recordedAt
                : new Date().toISOString(),
          };
        })
        .filter(
          (
            entry,
          ): entry is CandidateSessionState["previousAnswers"][number] =>
            Boolean(entry),
        )
    : [];

  return {
    currentQuestionIndex,
    currentQuestionId:
      typeof state.currentQuestionId === "string"
        ? state.currentQuestionId
        : baseQuestion?.id ?? null,
    currentQuestionText:
      typeof state.currentQuestionText === "string" && state.currentQuestionText
        ? state.currentQuestionText
        : baseQuestion?.prompt ?? "",
    followUpDepth: typeof state.followUpDepth === "number" ? state.followUpDepth : 0,
    askedQuestions,
    previousAnswers,
    completed: Boolean(state.completed),
    difficulty: isDifficulty(state.difficulty)
      ? state.difficulty
      : defaultDifficulty,
    startedAt:
      typeof state.startedAt === "string"
        ? state.startedAt
        : new Date().toISOString(),
  };
}

async function getAdminClient(): Promise<any> {
  const admin = createSupabaseAdminClient();

  if (!admin) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return admin;
}

async function getInterviewRowBySlug(slug: string) {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("interviews")
    .select("id, interviewer_id, slug, title, topic, difficulty, status")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getQuestionsForInterview(interviewId: string) {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, interview_id, prompt, order_index, source, difficulty, rationale")
    .eq("interview_id", interviewId)
    .order("order_index", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
    normalizeQuestionRow(row),
  );
}

function buildInitialCandidateState(
  question: InterviewQuestion,
  difficulty: PublicInterview["difficulty"],
): CandidateSessionState {
  return {
    currentQuestionIndex: 0,
    currentQuestionId: question.id,
    currentQuestionText: question.prompt,
    followUpDepth: 0,
    askedQuestions: [question.prompt],
    previousAnswers: [],
    completed: false,
    difficulty,
    startedAt: new Date().toISOString(),
  };
}

export async function ensureUserProfile(
  user: User,
  fallbackRole: UserRole = "interviewer",
): Promise<{
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
}> {
  const admin = await getAdminClient();
  const profilePayload = {
    id: user.id,
    email: user.email,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    role:
      user.user_metadata?.role === "candidate" ||
      user.user_metadata?.role === "interviewer"
        ? user.user_metadata.role
        : fallbackRole,
  };

  const { data, error } = await admin
    .from("users")
    .upsert(profilePayload, { onConflict: "id" })
    .select("id, email, full_name, role")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    email: string | null;
    full_name: string | null;
    role: UserRole;
  };
}

export async function createInterviewRecord(
  interviewerId: string,
  payload: InterviewCreationPayload,
) {
  const admin = await getAdminClient();
  const slug = generateShareSlug(payload.title);

  const { data: interview, error: interviewError } = await admin
    .from("interviews")
    .insert({
      interviewer_id: interviewerId,
      slug,
      title: payload.title,
      topic: payload.topic,
      difficulty: payload.difficulty,
      status: "published",
    })
    .select("id, slug, title, topic, difficulty")
    .single();

  if (interviewError) {
    throw interviewError;
  }

  const questionPayload = payload.questions.map((question, index: number) => ({
    interview_id: interview.id,
    order_index: index,
    prompt: question.prompt,
    source: question.source,
    difficulty: question.difficulty ?? payload.difficulty,
    rationale: question.rationale ?? null,
  }));

  const { error: questionError } = await admin.from("questions").insert(questionPayload);

  if (questionError) {
    throw questionError;
  }

  return {
    id: interview.id,
    slug,
    title: interview.title,
    topic: interview.topic,
    difficulty: interview.difficulty,
    shareUrl: `/interview/${slug}`,
    questionCount: questionPayload.length,
  };
}

export async function getPublicInterviewSummaryBySlug(slug: string) {
  const interview = await getInterviewRowBySlug(slug);

  if (!interview || interview.status !== "published") {
    return null;
  }

  const questions = await getQuestionsForInterview(String(interview.id));

  return {
    id: String(interview.id),
    interviewerId: String(interview.interviewer_id),
    slug: String(interview.slug),
    title: String(interview.title),
    topic: String(interview.topic),
    difficulty: isDifficulty(interview.difficulty) ? interview.difficulty : "medium",
    questionCount: questions.length,
  } satisfies PublicInterview;
}

export async function startInterviewSession(input: {
  interviewSlug: string;
  name: string;
  email: string;
}) {
  const admin = await getAdminClient();
  const interview = await getPublicInterviewSummaryBySlug(input.interviewSlug);

  if (!interview) {
    throw new Error("Interview not found or not published.");
  }

  const questions = await getQuestionsForInterview(interview.id);

  if (!questions.length) {
    throw new Error("This interview has no questions configured.");
  }

  const initialState = buildInitialCandidateState(questions[0], interview.difficulty);
  const { data: candidate, error } = await admin
    .from("candidates")
    .insert({
      interview_id: interview.id,
      name: input.name,
      email: input.email,
      status: "in_progress",
      started_at: new Date().toISOString(),
      session_state: initialState,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return {
    candidateId: String(candidate.id),
    interview,
    question: {
      text: questions[0].prompt,
      sequence: 1,
      total: questions.length,
      source: "base" as const,
    },
  };
}

export async function getCandidateSessionContext(
  candidateId: string,
): Promise<CandidateSessionContext | null> {
  const admin = await getAdminClient();
  const { data: candidateRow, error: candidateError } = await admin
    .from("candidates")
    .select(
      "id, interview_id, name, email, status, started_at, completed_at, session_state",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError) {
    throw candidateError;
  }

  if (!candidateRow) {
    return null;
  }

  const { data: interviewRow, error: interviewError } = await admin
    .from("interviews")
    .select("id, interviewer_id, slug, title, topic, difficulty")
    .eq("id", candidateRow.interview_id)
    .single();

  if (interviewError) {
    throw interviewError;
  }

  const questions = await getQuestionsForInterview(String(candidateRow.interview_id));
  const interview: PublicInterview = {
    id: String(interviewRow.id),
    interviewerId: String(interviewRow.interviewer_id),
    slug: String(interviewRow.slug),
    title: String(interviewRow.title),
    topic: String(interviewRow.topic),
    difficulty: isDifficulty(interviewRow.difficulty)
      ? interviewRow.difficulty
      : "medium",
    questionCount: questions.length,
  };

  const { data: responseRows, error: responseError } = await admin
    .from("responses")
    .select(
      "id, candidate_id, interview_id, question_id, asked_question, answer_text, is_follow_up, sequence_no",
    )
    .eq("candidate_id", candidateId)
    .order("sequence_no", { ascending: true });

  if (responseError) {
    throw responseError;
  }

  const { data: resultRow, error: resultError } = await admin
    .from("results")
    .select("technical, communication, confidence, overall, feedback")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (resultError) {
    throw resultError;
  }

  return {
    candidate: {
      id: String(candidateRow.id),
      name: String(candidateRow.name),
      email: String(candidateRow.email),
      interviewId: String(candidateRow.interview_id),
      status: String(candidateRow.status) as CandidateStatus,
      startedAt:
        typeof candidateRow.started_at === "string" ? candidateRow.started_at : null,
      completedAt:
        typeof candidateRow.completed_at === "string"
          ? candidateRow.completed_at
          : null,
    },
    interview,
    questions,
    state: normalizeCandidateState(
      candidateRow.session_state,
      questions,
      interview.difficulty,
    ),
    responses: ((responseRows ?? []) as Array<Record<string, unknown>>).map(
      (row) => ({
      id: String(row.id),
      candidateId: String(row.candidate_id),
      interviewId: String(row.interview_id),
      questionId: typeof row.question_id === "string" ? row.question_id : null,
      askedQuestion: String(row.asked_question),
      answerText: String(row.answer_text),
      isFollowUp: Boolean(row.is_follow_up),
      sequenceNo: Number(row.sequence_no),
      }),
    ),
    result: resultRow
      ? {
          technical: Number(resultRow.technical),
          communication: Number(resultRow.communication),
          confidence: Number(resultRow.confidence),
          overall: Number(resultRow.overall),
          feedback: String(resultRow.feedback),
        }
      : null,
  };
}

export async function recordCandidateAnswer(input: {
  candidateId: string;
  answerText: string;
  answerDurationSeconds: number;
  transcriptMeta: Record<string, unknown>;
}) {
  const admin = await getAdminClient();
  const context = await getCandidateSessionContext(input.candidateId);

  if (!context) {
    throw new Error("Candidate session not found.");
  }

  if (context.candidate.status === "completed") {
    throw new Error("This interview is already completed.");
  }

  const sequenceNo = context.state.previousAnswers.length + 1;
  const isFollowUp = context.state.followUpDepth > 0;
  const now = new Date().toISOString();

  const { data: response, error } = await admin
    .from("responses")
    .insert({
      candidate_id: context.candidate.id,
      interview_id: context.interview.id,
      question_id: context.state.currentQuestionId,
      asked_question: context.state.currentQuestionText,
      answer_text: input.answerText,
      transcript_meta: input.transcriptMeta,
      sequence_no: sequenceNo,
      is_follow_up: isFollowUp,
      answer_duration_seconds: input.answerDurationSeconds,
    })
    .select(
      "id, candidate_id, interview_id, question_id, asked_question, answer_text, is_follow_up, sequence_no",
    )
    .single();

  if (error) {
    throw error;
  }

  const updatedState: CandidateSessionState = {
    ...context.state,
    previousAnswers: [
      ...context.state.previousAnswers,
      {
        question: context.state.currentQuestionText,
        answer: input.answerText,
        questionId: context.state.currentQuestionId,
        sequenceNo,
        source: isFollowUp ? "follow_up" : "base",
        recordedAt: now,
      },
    ],
  };

  const { error: updateError } = await admin
    .from("candidates")
    .update({ session_state: updatedState })
    .eq("id", context.candidate.id);

  if (updateError) {
    throw updateError;
  }

  return {
    id: String(response.id),
    candidateId: String(response.candidate_id),
    interviewId: String(response.interview_id),
    questionId:
      typeof response.question_id === "string" ? response.question_id : null,
    askedQuestion: String(response.asked_question),
    answerText: String(response.answer_text),
    isFollowUp: Boolean(response.is_follow_up),
    sequenceNo: Number(response.sequence_no),
  };
}

export async function advanceCandidateSession(input: {
  candidateId: string;
  decision: NextQuestionDecision;
}) {
  const admin = await getAdminClient();
  const context = await getCandidateSessionContext(input.candidateId);

  if (!context) {
    throw new Error("Candidate session not found.");
  }

  const nextBaseQuestion =
    context.questions[context.state.currentQuestionIndex + 1] ?? null;

  if (
    input.decision.action === "follow_up" &&
    input.decision.question.trim() &&
    context.state.followUpDepth < 1
  ) {
    const followUpPrompt = input.decision.question.trim();
    const nextState: CandidateSessionState = {
      ...context.state,
      currentQuestionText: followUpPrompt,
      followUpDepth: context.state.followUpDepth + 1,
      askedQuestions: [...context.state.askedQuestions, followUpPrompt],
      difficulty: input.decision.updatedDifficulty,
    };

    const { error } = await admin
      .from("candidates")
      .update({ session_state: nextState })
      .eq("id", input.candidateId);

    if (error) {
      throw error;
    }

    return {
      complete: false,
      question: {
        text: followUpPrompt,
        sequence: context.state.currentQuestionIndex + 1,
        total: context.questions.length,
        source: "follow_up" as const,
      },
      state: nextState,
    };
  }

  if (nextBaseQuestion) {
    const nextState: CandidateSessionState = {
      ...context.state,
      currentQuestionIndex: context.state.currentQuestionIndex + 1,
      currentQuestionId: nextBaseQuestion.id,
      currentQuestionText: nextBaseQuestion.prompt,
      followUpDepth: 0,
      askedQuestions: [...context.state.askedQuestions, nextBaseQuestion.prompt],
      difficulty: input.decision.updatedDifficulty,
    };

    const { error } = await admin
      .from("candidates")
      .update({ session_state: nextState })
      .eq("id", input.candidateId);

    if (error) {
      throw error;
    }

    return {
      complete: false,
      question: {
        text: nextBaseQuestion.prompt,
        sequence: nextState.currentQuestionIndex + 1,
        total: context.questions.length,
        source: "base" as const,
      },
      state: nextState,
    };
  }

  const completedState: CandidateSessionState = {
    ...context.state,
    completed: true,
    currentQuestionId: null,
    currentQuestionText: "",
    difficulty: input.decision.updatedDifficulty,
  };

  const { error } = await admin
    .from("candidates")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      session_state: completedState,
    })
    .eq("id", input.candidateId);

  if (error) {
    throw error;
  }

  return {
    complete: true,
    state: completedState,
  };
}

export async function saveInterviewResult(
  candidateId: string,
  interviewId: string,
  result: EvaluationResult,
) {
  const admin = await getAdminClient();
  const { data, error } = await admin
    .from("results")
    .upsert(
      {
        candidate_id: candidateId,
        interview_id: interviewId,
        technical: result.technical,
        communication: result.communication,
        confidence: result.confidence,
        overall: result.overall,
        feedback: result.feedback,
        raw_evaluation: result,
      },
      { onConflict: "candidate_id" },
    )
    .select("technical, communication, confidence, overall, feedback")
    .single();

  if (error) {
    throw error;
  }

  return {
    technical: Number(data.technical),
    communication: Number(data.communication),
    confidence: Number(data.confidence),
    overall: Number(data.overall),
    feedback: String(data.feedback),
  };
}

export async function completeCandidateSession(candidateId: string) {
  const admin = await getAdminClient();
  const context = await getCandidateSessionContext(candidateId);

  if (!context) {
    throw new Error("Candidate session not found.");
  }

  if (context.candidate.status !== "completed" || !context.state.completed) {
    const completedState: CandidateSessionState = {
      ...context.state,
      completed: true,
      currentQuestionId: null,
      currentQuestionText: "",
    };

    const { error } = await admin
      .from("candidates")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        session_state: completedState,
      })
      .eq("id", candidateId);

    if (error) {
      throw error;
    }
  }

  return context;
}

export async function getInterviewerDashboardData(
  interviewerId: string,
  appUrl: string,
) {
  const admin = await getAdminClient();
  const { data: interviewRows, error: interviewError } = await admin
    .from("interviews")
    .select("id, slug, title, topic, difficulty, created_at")
    .eq("interviewer_id", interviewerId)
    .order("created_at", { ascending: false });

  if (interviewError) {
    throw interviewError;
  }

  const interviews = interviewRows ?? [];

  if (!interviews.length) {
    return [] satisfies DashboardInterview[];
  }

  const interviewIds = (interviews as Array<Record<string, unknown>>).map(
    (interview) => String(interview.id),
  );
  const { data: questionRows, error: questionError } = await admin
    .from("questions")
    .select("interview_id")
    .in("interview_id", interviewIds);

  if (questionError) {
    throw questionError;
  }

  const { data: candidateRows, error: candidateError } = await admin
    .from("candidates")
    .select("id, interview_id, name, email, status, started_at, completed_at")
    .in("interview_id", interviewIds)
    .order("started_at", { ascending: false });

  if (candidateError) {
    throw candidateError;
  }

  const candidates = candidateRows ?? [];
  const candidateIds = (candidates as Array<Record<string, unknown>>).map(
    (candidate) => String(candidate.id),
  );

  const { data: resultRows, error: resultError } =
    candidateIds.length > 0
      ? await admin
          .from("results")
          .select(
            "candidate_id, technical, communication, confidence, overall, feedback",
          )
          .in("candidate_id", candidateIds)
      : { data: [], error: null };

  if (resultError) {
    throw resultError;
  }

  const { data: responseRows, error: responseError } =
    candidateIds.length > 0
      ? await admin
          .from("responses")
          .select(
            "candidate_id, asked_question, answer_text, is_follow_up, sequence_no",
          )
          .in("candidate_id", candidateIds)
          .order("sequence_no", { ascending: true })
      : { data: [], error: null };

  if (responseError) {
    throw responseError;
  }

  const questionCountByInterview = new Map<string, number>();
  ((questionRows ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const interviewId = String(row.interview_id);
    questionCountByInterview.set(
      interviewId,
      (questionCountByInterview.get(interviewId) ?? 0) + 1,
    );
  });

  const resultByCandidate = new Map<string, EvaluationResult>();
  ((resultRows ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    resultByCandidate.set(String(row.candidate_id), {
      technical: Number(row.technical),
      communication: Number(row.communication),
      confidence: Number(row.confidence),
      overall: Number(row.overall),
      feedback: String(row.feedback),
    });
  });

  const responsesByCandidate = new Map<
    string,
    Array<{ askedQuestion: string; answerText: string; isFollowUp: boolean }>
  >();
  ((responseRows ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const candidateId = String(row.candidate_id);
    const collection = responsesByCandidate.get(candidateId) ?? [];
    collection.push({
      askedQuestion: String(row.asked_question),
      answerText: String(row.answer_text),
      isFollowUp: Boolean(row.is_follow_up),
    });
    responsesByCandidate.set(candidateId, collection);
  });

  return (interviews as Array<Record<string, unknown>>).map((interview) => ({
    id: String(interview.id),
    slug: String(interview.slug),
    title: String(interview.title),
    topic: String(interview.topic),
    difficulty: isDifficulty(interview.difficulty) ? interview.difficulty : "medium",
    createdAt:
      typeof interview.created_at === "string" ? interview.created_at : null,
    questionCount: questionCountByInterview.get(String(interview.id)) ?? 0,
    shareUrl: `${appUrl.replace(/\/$/, "")}/interview/${interview.slug}`,
    candidates: (candidates as Array<Record<string, unknown>>)
      .filter(
        (candidate) => String(candidate.interview_id) === String(interview.id),
      )
      .map((candidate) => ({
        id: String(candidate.id),
        name: String(candidate.name),
        email: String(candidate.email),
        status: String(candidate.status) as CandidateStatus,
        startedAt:
          typeof candidate.started_at === "string" ? candidate.started_at : null,
        completedAt:
          typeof candidate.completed_at === "string"
            ? candidate.completed_at
            : null,
        score: resultByCandidate.get(String(candidate.id)) ?? null,
        responses: responsesByCandidate.get(String(candidate.id)) ?? [],
      })),
  })) satisfies DashboardInterview[];
}
