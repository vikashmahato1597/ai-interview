# PulseHire AI

PulseHire AI is a voice-first AI interview platform built with Next.js, Supabase, Azure OpenAI, and Azure Speech.

It lets an interviewer create an interview, publish a shareable candidate link, and review transcripts plus AI scoring after the interview is complete.

## What This Project Does

This application supports two main user experiences:

### Interviewer

- Sign up or sign in
- Create an interview with title, topic, and difficulty
- Generate questions with AI or write them manually
- Publish a share link
- Track candidates on a dashboard
- Review answers, transcripts, scores, and feedback

### Candidate

- Open a public interview link
- Enter name and email
- Grant microphone access
- Hear one question at a time
- Answer by voice
- End the interview early if needed
- See a final scorecard at the end

## Why This Project Exists

Traditional interview tools often focus on video meetings, scheduling, or generic forms. This project focuses on a narrower and more practical workflow:

- A recruiter or hiring manager wants a reusable technical interview
- A candidate should be able to answer without needing an account
- The interview should feel conversational, not like a static form
- The result should be structured enough for later review

The goal is to provide a lightweight technical interview system that is easier to run than live calls, while still capturing useful signals.

## Key Capabilities

- Voice-based candidate interview flow
- AI-generated interview questions
- Manual question editing
- Adaptive follow-up question logic
- Transcript persistence
- Structured AI scoring
- Interviewer dashboard with candidate history
- Optional early end for candidates
- Dynamic share-link generation from the current request origin

## Tech Stack

| Area | Technology | Why it is used |
| --- | --- | --- |
| Frontend framework | Next.js 16 App Router | Server rendering, route handlers, and clean client/server separation |
| UI | React 19 | Component model for interviewer and candidate flows |
| Language | TypeScript | Strong typing across pages, APIs, and domain models |
| Styling | Tailwind CSS v4 | Fast UI iteration with utility classes |
| Auth and database | Supabase | Email/password auth, Postgres, and a simple hosted backend |
| Server-side Supabase integration | `@supabase/ssr` | Cookie-aware server and middleware helpers |
| LLM | Azure OpenAI | Question generation, follow-up decisions, and evaluation |
| AI client SDK | `openai` | Structured response parsing against Zod schemas |
| Validation | Zod | Runtime validation for request payloads and AI output |
| Speech-to-text | Azure Speech SDK, Web Speech API fallback | Candidate voice capture |
| Text-to-speech | Azure Speech SDK, browser SpeechSynthesis fallback | Spoken interview prompts |

## Documentation

- [Getting Started And Usage](./docs/GETTING_STARTED.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API_REFERENCE.md)

## Quick Start

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example`.

3. Run the SQL schema in [supabase/schema.sql](./supabase/schema.sql).

4. Start the app.

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Environment Variables

The application no longer needs `NEXT_PUBLIC_APP_URL`. Share links are generated from the current request origin.

Required or optional variables are documented in [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md).

## Folder Overview

```text
src/
  app/
    api/
    dashboard/
    interview/[slug]/
    interviews/new/
    sign-in/
    sign-up/
  components/
    auth/
    interview/
    interviews/
    navigation/
  hooks/
  lib/
    interview/
    supabase/
    voice/
supabase/
  schema.sql
```

## Current Product Scope

This repository is currently an MVP with clear tradeoffs:

- Candidate authentication is intentionally skipped for the share-link flow
- Interview progression is request/response based, not real-time streaming
- Retell is modeled as a future extension point, not a fully wired provider
- Results are AI-assisted and should support review, not replace judgment

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Who Should Read Which Doc

- Use [Getting Started And Usage](./docs/GETTING_STARTED.md) if you want to run or operate the app
- Use [Architecture Guide](./docs/ARCHITECTURE.md) if you want to understand how it works internally
- Use [API Reference](./docs/API_REFERENCE.md) if you want endpoint-level request and response details
