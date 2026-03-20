# PulseHire AI

Real-time AI voice interview MVP built with Next.js App Router, Supabase, Azure OpenAI, and Tailwind CSS.

## Stack

- Next.js 16 App Router with API routes
- TypeScript
- Supabase Auth + PostgreSQL
- Azure OpenAI for question generation, follow-up decisions, and evaluation
- Tailwind CSS v4
- Web Speech API + SpeechSynthesis browser fallback

## Core flow

### Interviewer

1. Sign up or sign in with Supabase email/password auth.
2. Create an interview with `title`, `topic`, `difficulty`.
3. Generate questions with Azure OpenAI or edit them manually.
4. Publish the interview and copy the share link.
5. Review candidates, transcripts, scores, and AI feedback in the dashboard.

### Candidate

1. Open the share link.
2. Enter name and email.
3. Grant microphone permission only.
4. Hear one question at a time.
5. Answer by voice.
6. Let silence detection auto-submit or stop manually.
7. Receive a final scorecard after completion.

## API routes

- `POST /api/generate-questions`
- `POST /api/interviews`
- `POST /api/start-interview`
- `POST /api/submit-answer`
- `POST /api/next-question`
- `POST /api/evaluate`
- `GET /api/speech-token`

## Folder structure

```text
src/
  app/
    api/
      evaluate/route.ts
      generate-questions/route.ts
      interviews/route.ts
      next-question/route.ts
      start-interview/route.ts
      submit-answer/route.ts
    dashboard/page.tsx
    interview/[slug]/page.tsx
    interviews/new/page.tsx
    sign-in/page.tsx
    sign-up/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    auth/auth-form.tsx
    interview/
      interview-room.tsx
      mic-button.tsx
      question-card.tsx
      score-card.tsx
      timer.tsx
      voice-player.tsx
    interviews/interview-builder.tsx
  hooks/
    use-interview-session.ts
    use-speech-recognition.ts
  lib/
    env.ts
    openai.ts
    prompts.ts
    utils.ts
    interview/
      engine.ts
      repository.ts
      schemas.ts
      types.ts
    supabase/
      admin.ts
      browser.ts
      middleware.ts
      server.ts
    voice/
      browser.ts
      config.ts
middleware.ts
supabase/schema.sql
```

## Environment

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=

NEXT_PUBLIC_TTS_PROVIDER=browser
NEXT_PUBLIC_STT_PROVIDER=browser

AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
NEXT_PUBLIC_AZURE_SPEECH_VOICE_NAME=en-US-AvaMultilingualNeural
RETELL_API_KEY=
```

Notes:

- The app is wired for Azure OpenAI through the Azure `openai/v1` endpoint shape.
- Supabase public config accepts either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- Azure Speech now uses a server-issued token route for browser SDK access.
- Browser speech remains the fallback path.
- Azure Speech and Retell are modeled as optional provider upgrades via env flags.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the Supabase SQL in [`supabase/schema.sql`](./supabase/schema.sql).

3. Configure `.env.local`.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Build for production:

   ```bash
   npm run build
   ```

## Prompting

The prompt layer lives in [`src/lib/prompts.ts`](./src/lib/prompts.ts).

- Question generation prompt: creates concise, voice-friendly interview questions.
- Next question prompt: decides between follow-up, next question, or completion.
- Evaluation prompt: returns strict JSON with `technical`, `communication`, `confidence`, `overall`, and `feedback`.

## Database model

Tables in the Supabase schema:

- `users`
- `interviews`
- `questions`
- `candidates`
- `responses`
- `results`

The `candidates.session_state` JSON field stores:

- `currentQuestionIndex`
- `currentQuestionId`
- `currentQuestionText`
- `followUpDepth`
- `askedQuestions`
- `previousAnswers`
- `difficulty`

## Voice behavior

- Text-to-speech: Azure Speech SDK is supported through `/api/speech-token`, with browser `SpeechSynthesis` fallback.
- Speech-to-text: Azure Speech SDK is supported through `/api/speech-token`, with Web Speech API fallback.
- Silence detection: handled in `use-speech-recognition.ts`.
- Auto-progress: candidate answers are saved, then `/api/next-question` decides the next step.

## What is production-minded here

- Server-only Azure OpenAI usage
- Server-side Supabase helpers
- Typed request validation with `zod`
- Clear separation between pages, hooks, components, domain logic, and persistence
- SQL schema with enums, indexes, trigger-based user profile sync, and RLS

## Current limits

- Retell is still an extension point and is not wired yet.
- Candidate auth is intentionally skipped for the share-link flow.
- No real-time streaming; this MVP uses request/response turns only.
