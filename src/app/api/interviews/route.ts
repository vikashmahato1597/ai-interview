import { NextResponse } from "next/server";
import { createInterviewRecord, ensureUserProfile } from "@/lib/interview/repository";
import { createInterviewRequestSchema } from "@/lib/interview/schemas";
import { buildAbsoluteUrl } from "@/lib/request-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase environment variables are missing. Configure auth and database access first.",
        },
        { status: 500 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in as an interviewer to create interviews.",
        },
        { status: 401 },
      );
    }

    const profile = await ensureUserProfile(user);

    if (profile?.role !== "interviewer") {
      return NextResponse.json(
        {
          error: "Only interviewer accounts can publish interviews.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createInterviewRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid interview payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const interview = await createInterviewRecord(user.id, parsed.data);
    const origin = new URL(request.url).origin;

    return NextResponse.json({
      ...interview,
      absoluteShareUrl: buildAbsoluteUrl(origin, interview.shareUrl),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the interview.",
      },
      { status: 500 },
    );
  }
}
