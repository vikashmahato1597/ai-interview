import { AuthForm } from "@/components/auth/auth-form";

export default function SignInPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="surface-card rounded-[2rem] p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
          Platform access
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Sign in to manage live AI interviews.
        </h1>
        <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-300">
          <li>Create role-specific interviews with manual or AI-generated prompts.</li>
          <li>Share candidate links and keep the experience mic-only.</li>
          <li>Review transcripts, scoring, and structured AI feedback.</li>
        </ul>
      </div>
      <AuthForm mode="sign-in" />
    </div>
  );
}
