create extension if not exists pgcrypto;

create type public.user_role as enum ('interviewer', 'candidate');
create type public.interview_difficulty as enum ('easy', 'medium', 'hard');
create type public.interview_status as enum ('draft', 'published', 'archived');
create type public.question_source as enum ('manual', 'ai', 'follow_up');
create type public.candidate_status as enum ('invited', 'in_progress', 'completed');

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  role public.user_role not null default 'interviewer',
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  interviewer_id uuid not null references public.users (id) on delete cascade,
  slug text unique not null,
  title text not null,
  topic text not null,
  difficulty public.interview_difficulty not null,
  status public.interview_status not null default 'published',
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews (id) on delete cascade,
  order_index integer not null,
  prompt text not null,
  source public.question_source not null default 'manual',
  difficulty public.interview_difficulty not null,
  rationale text,
  created_at timestamptz not null default now(),
  unique (interview_id, order_index)
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews (id) on delete cascade,
  name text not null,
  email text not null,
  status public.candidate_status not null default 'invited',
  session_state jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  asked_question text not null,
  answer_text text not null,
  transcript_meta jsonb not null default '{}'::jsonb,
  sequence_no integer not null,
  is_follow_up boolean not null default false,
  answer_duration_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  unique (candidate_id, sequence_no)
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid unique not null references public.candidates (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  technical numeric(3,1) not null,
  communication numeric(3,1) not null,
  confidence numeric(3,1) not null,
  overall numeric(3,1) not null,
  feedback text not null,
  raw_evaluation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists interviews_interviewer_id_idx on public.interviews (interviewer_id);
create index if not exists questions_interview_id_idx on public.questions (interview_id);
create index if not exists candidates_interview_id_idx on public.candidates (interview_id);
create index if not exists responses_candidate_id_idx on public.responses (candidate_id);
create index if not exists responses_interview_id_idx on public.responses (interview_id);
create index if not exists results_interview_id_idx on public.results (interview_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'interviewer')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.interviews enable row level security;
alter table public.questions enable row level security;
alter table public.candidates enable row level security;
alter table public.responses enable row level security;
alter table public.results enable row level security;

create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.users
for update
to authenticated
using (auth.uid() = id);

create policy "Interviewers can read own interviews"
on public.interviews
for select
to authenticated
using (auth.uid() = interviewer_id);

create policy "Interviewers can create own interviews"
on public.interviews
for insert
to authenticated
with check (auth.uid() = interviewer_id);

create policy "Interviewers can update own interviews"
on public.interviews
for update
to authenticated
using (auth.uid() = interviewer_id);

create policy "Published interviews are publicly readable"
on public.interviews
for select
to anon, authenticated
using (status = 'published');

create policy "Questions for published interviews are readable"
on public.questions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.interviews
    where public.interviews.id = questions.interview_id
      and public.interviews.status = 'published'
  )
);

create policy "Interviewers can manage own questions"
on public.questions
for all
to authenticated
using (
  exists (
    select 1
    from public.interviews
    where public.interviews.id = questions.interview_id
      and public.interviews.interviewer_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.interviews
    where public.interviews.id = questions.interview_id
      and public.interviews.interviewer_id = auth.uid()
  )
);

create policy "Interviewers can read own candidates"
on public.candidates
for select
to authenticated
using (
  exists (
    select 1
    from public.interviews
    where public.interviews.id = candidates.interview_id
      and public.interviews.interviewer_id = auth.uid()
  )
);

create policy "Interviewers can read own responses"
on public.responses
for select
to authenticated
using (
  exists (
    select 1
    from public.interviews
    where public.interviews.id = responses.interview_id
      and public.interviews.interviewer_id = auth.uid()
  )
);

create policy "Interviewers can read own results"
on public.results
for select
to authenticated
using (
  exists (
    select 1
    from public.interviews
    where public.interviews.id = results.interview_id
      and public.interviews.interviewer_id = auth.uid()
  )
);
