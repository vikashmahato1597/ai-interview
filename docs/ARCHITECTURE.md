# Architecture Guide

This document explains how PulseHire AI is structured internally, why specific technologies are used, and how data flows through the system.

## 1. High-Level Architecture

At a high level, the app has four main responsibilities:

1. Manage interviewer authentication and dashboard data
2. Create and publish interviews
3. Run candidate interview sessions
4. Generate and store AI-assisted evaluation results

## 2. System Overview

```text
Browser UI
  |
  v
Next.js App Router
  |- Server Components
  |- Client Components
  |- API Route Handlers
  |
  +--> Supabase
  |     |- Auth
  |     |- Postgres
  |
  +--> Azure OpenAI
  |
  +--> Azure Speech / Browser Speech APIs
```

## 3. Why These Technologies Were Chosen

### Next.js App Router

Used because the project needs:

- server-rendered dashboard pages
- API route handlers
- clean boundaries between client-only and server-only logic
- middleware for auth/session refresh

### React

Used for:

- interactive candidate interview flow
- interviewer dashboard UI
- reusable components for forms, cards, timers, and speech UI

### TypeScript

Used to keep contracts clear across:

- request payloads
- domain models
- API responses
- repository logic
- UI state

### Supabase

Used because it gives the project:

- email/password auth
- Postgres storage
- a simple hosted backend
- row-level security support

### Azure OpenAI

Used for:

- question generation
- follow-up decision making
- evaluation scoring

The app uses structured output parsing so responses map directly into typed schemas instead of free-form text.

### Zod

Used for:

- request validation in route handlers
- structured AI response validation
- reducing broken contracts between frontend, backend, and model output

### Azure Speech And Browser Speech

Used because the app is voice-first. Azure Speech provides a stronger production path, while browser APIs provide a fallback for local development or limited environments.

## 4. Repository Structure

## App Layer

- `src/app/layout.tsx`
  - root layout
  - uses a shared header
- `src/app/page.tsx`
  - landing page
- `src/app/dashboard/page.tsx`
  - interviewer dashboard
- `src/app/interviews/new/page.tsx`
  - interview builder page
- `src/app/interview/[slug]/page.tsx`
  - public candidate interview page
- `src/app/sign-in/page.tsx`
  - sign-in screen
- `src/app/sign-up/page.tsx`
  - sign-up screen

## API Layer

- `src/app/api/interviews/route.ts`
  - create and publish interviews
- `src/app/api/generate-questions/route.ts`
  - generate AI questions
- `src/app/api/start-interview/route.ts`
  - start candidate session
- `src/app/api/submit-answer/route.ts`
  - save one answer
- `src/app/api/next-question/route.ts`
  - decide next question or complete session
- `src/app/api/evaluate/route.ts`
  - evaluate a candidate
- `src/app/api/end-interview/route.ts`
  - optional early completion
- `src/app/api/speech-token/route.ts`
  - issue Azure Speech auth tokens to the browser

## Domain Layer

- `src/lib/interview/repository.ts`
  - persistence and data fetching
- `src/lib/interview/engine.ts`
  - AI orchestration and fallback logic
- `src/lib/interview/schemas.ts`
  - Zod request and response schemas
- `src/lib/interview/types.ts`
  - TypeScript domain types

## Platform Layer

- `src/lib/supabase/*`
  - browser, server, admin, and middleware helpers
- `src/lib/openai.ts`
  - Azure OpenAI client wrapper
- `src/lib/env.ts`
  - environment variable parsing
- `src/lib/request-url.ts`
  - dynamic origin handling for share links
- `src/lib/voice/*`
  - speech provider utilities

## UI Layer

- `src/components/auth/*`
- `src/components/interview/*`
- `src/components/interviews/*`
- `src/components/navigation/*`

## 5. Main Product Flows

### Interview Creation Flow

```text
Interviewer UI
  -> POST /api/interviews
  -> request validated with Zod
  -> interviewer auth checked with Supabase
  -> interview row inserted
  -> question rows inserted
  -> share URL returned
```

### Candidate Session Flow

```text
Candidate opens /interview/[slug]
  -> enters name and email
  -> POST /api/start-interview
  -> candidate row created
  -> first question returned
  -> browser speaks question
  -> candidate answers
  -> POST /api/submit-answer
  -> POST /api/next-question
  -> AI decides follow-up or next question
  -> repeat until complete
  -> evaluate and store result
```

### Early End Flow

```text
Candidate clicks End interview
  -> POST /api/end-interview
  -> candidate session marked complete
  -> stored responses evaluated
  -> result saved
  -> scorecard returned
```

### Dashboard Flow

```text
Dashboard page
  -> server-side auth check
  -> fetch interviews for interviewer
  -> fetch candidates, responses, and results
  -> aggregate counts and score summaries
  -> render interview cards and candidate details
```

## 6. Data Model

### `users`

Stores interviewer or candidate profile metadata linked to `auth.users`.

### `interviews`

Stores the interview definition:

- interviewer
- slug
- title
- topic
- difficulty
- status

### `questions`

Stores the ordered interview question set.

### `candidates`

Stores one candidate session per started interview attempt, including:

- candidate name
- email
- status
- timestamps
- session state JSON

### `responses`

Stores each spoken answer with:

- asked question text
- answer text
- follow-up flag
- sequence number
- transcript metadata

### `results`

Stores final evaluation output:

- technical
- communication
- confidence
- overall
- feedback
- raw evaluation payload

## 7. Candidate Session State

The candidate session uses a JSON state object stored on the `candidates` row.

Important fields:

- `currentQuestionIndex`
- `currentQuestionId`
- `currentQuestionText`
- `followUpDepth`
- `askedQuestions`
- `previousAnswers`
- `completed`
- `difficulty`
- `startedAt`

This allows the interview to continue across requests without a custom realtime session service.

## 8. AI Design

The AI layer uses structured outputs instead of plain text wherever possible.

### Question Generation

Input:

- title
- topic
- difficulty
- question count

Output:

- question text
- rationale
- difficulty

### Next Question Decision

Input:

- current interview metadata
- planned questions
- current state
- latest answer

Output:

- `follow_up`, `next_question`, or `complete`
- follow-up question if needed
- reason
- updated difficulty

### Evaluation

Input:

- interview info
- candidate info
- all stored responses

Output:

- technical
- communication
- confidence
- overall
- feedback

If Azure OpenAI fails, the app falls back to heuristic logic so the flow does not fully break.

## 9. Auth And Security Model

### Interviewer Auth

Interviewers authenticate with Supabase email/password auth.

### Candidate Access

Candidates do not authenticate. They access a published interview through a share link and create a candidate session with name and email.

### Middleware

`middleware.ts` and `src/lib/supabase/middleware.ts` refresh auth state through request/response cookies.

### Service Role Usage

`SUPABASE_SERVICE_ROLE_KEY` is used on the server for admin-like operations in the repository layer. It must not be exposed to the browser.

### Row-Level Security

The Supabase schema enables RLS and includes policies so interviewers can access only their own interviews and related records through authenticated flows.

## 10. Speech Architecture

### Text-To-Speech

Primary path:

- Azure Speech SDK

Fallback:

- browser `SpeechSynthesis`

### Speech-To-Text

Primary path:

- Azure Speech SDK

Fallback:

- browser Web Speech API

### Why A Token Route Exists

The browser cannot safely hold an Azure Speech subscription key. Instead, the server issues short-lived speech tokens through `/api/speech-token`.

## 11. Dynamic Share-Link Design

The app now derives absolute URLs from the current request origin instead of a static app URL environment variable.

This prevents problems when:

- local development uses a different port
- the app runs behind a proxy
- the deployment host changes

Relevant helper:

- `src/lib/request-url.ts`

## 12. Current Limits And Extension Points

### Current Limits

- candidate flow is anonymous by design
- no realtime websocket interview transport
- no calendar or scheduling integration
- no interviewer collaboration features
- no candidate retry or replay policy controls

### Extension Points

- Retell provider integration
- richer scoring dimensions
- multi-round interview templates
- role-based admin tools
- export/reporting
- anti-cheat and proctoring features
