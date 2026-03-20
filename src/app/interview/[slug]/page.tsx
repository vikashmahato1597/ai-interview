import { InterviewRoom } from "@/components/interview/interview-room";
import { getPublicInterviewSummaryBySlug } from "@/lib/interview/repository";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const summary = await getPublicInterviewSummaryBySlug(slug).catch(() => null);

  return (
    <InterviewRoom
      interviewSlug={slug}
      interviewSummary={
        summary
          ? {
              title: summary.title,
              topic: summary.topic,
              difficulty: summary.difficulty,
              questionCount: summary.questionCount,
            }
          : null
      }
    />
  );
}
