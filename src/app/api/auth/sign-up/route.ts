import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const signUpSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(["interviewer", "candidate"]).default("interviewer"),
});

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "Supabase service role configuration is missing. Set SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid sign-up payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const { data: existingUsers, error: existingUsersError } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (existingUsersError) {
      throw existingUsersError;
    }

    const userAlreadyExists = (existingUsers.users ?? []).some(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    );

    if (userAlreadyExists) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        { status: 409 },
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      id: data.user?.id ?? null,
      email: data.user?.email ?? normalizedEmail,
      role: parsed.data.role,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create account.",
      },
      { status: 500 },
    );
  }
}
