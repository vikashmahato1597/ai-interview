import { AuthForm } from "@/components/auth/auth-form";

export default function SignUpPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="surface-card rounded-[2rem] p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
          Workspace setup
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Launch an interviewer workspace on Supabase Auth.
        </h1>
        <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-300">
          <li>Use email and password authentication with role metadata.</li>
          <li>Keep interview creation and candidate review behind authenticated routes.</li>
          <li>Store results in PostgreSQL for dashboards and later hiring review.</li>
        </ul>
      </div>
      <AuthForm mode="sign-up" />
    </div>
  );
}
