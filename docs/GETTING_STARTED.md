# Getting Started And Usage

This guide explains how to run PulseHire AI locally, configure dependencies, and use the product as both an interviewer and a candidate.

## 1. What You Need

Before you run the app, make sure you have:

- Node.js 20 or newer
- npm
- A Supabase project
- An Azure OpenAI deployment
- Optional but recommended: Azure Speech credentials for speech synthesis and speech recognition

## 2. Install The Project

From the repository root:

```bash
npm install
```

## 3. Configure The Database

Run the SQL in [supabase/schema.sql](../supabase/schema.sql) inside your Supabase SQL editor.

That schema creates:

- `users`
- `interviews`
- `questions`
- `candidates`
- `responses`
- `results`

It also creates:

- enum types
- indexes
- a trigger that syncs `auth.users` to `public.users`
- row-level security policies

## 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

### Environment Variable Reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by browser and server helpers |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes, unless using publishable default key | Public Supabase key for client/server auth flows |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Optional alternative | Alternative public key supported by the app |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key used for admin data access |
| `AZURE_OPENAI_API_KEY` | Yes for AI features | Auth for Azure OpenAI requests |
| `AZURE_OPENAI_ENDPOINT` | Yes for AI features | Azure OpenAI endpoint |
| `AZURE_OPENAI_DEPLOYMENT` | Yes for AI features | Model deployment name used by the app |
| `NEXT_PUBLIC_TTS_PROVIDER` | Optional | Preferred text-to-speech provider: `browser`, `azure`, or `retell` |
| `NEXT_PUBLIC_STT_PROVIDER` | Optional | Preferred speech-to-text provider: `browser` or `azure` |
| `AZURE_SPEECH_KEY` | Optional but recommended | Enables Azure Speech SDK token generation |
| `AZURE_SPEECH_REGION` | Optional but recommended | Azure Speech region |
| `NEXT_PUBLIC_AZURE_SPEECH_VOICE_NAME` | Optional | Voice name for Azure TTS |
| `RETELL_API_KEY` | Optional | Future-facing provider flag, not fully wired yet |

### Important Notes

- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.
- The app dynamically generates share links from the current request origin, so `NEXT_PUBLIC_APP_URL` is not required.
- If Azure Speech is not configured, the app falls back to browser speech APIs where possible.

## 5. Start The App

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

If another app is already using port `3000`, start this project on another port:

```bash
npm run dev -- --port 3001
```

Then open:

```text
http://localhost:3001
```

## 6. How To Use The App

### Interviewer Workflow

1. Open the home page.
2. Create an account or sign in.
3. Open the dashboard.
4. Click `Create interview`.
5. Fill in:
   - title
   - topic
   - difficulty
6. Generate AI questions or write your own.
7. Publish the interview.
8. Copy the generated share link.
9. Send the share link to a candidate.
10. Return to the dashboard later to review results.

### Candidate Workflow

1. Open the share link.
2. Enter name and email.
3. Allow microphone access.
4. Listen to the AI prompt.
5. Answer by voice.
6. Continue until the interview completes.
7. Optionally click `End interview` if you want to finish early.
8. Review the final scorecard.

## 7. What The Interviewer Sees

On the dashboard, the interviewer can see:

- total interviews
- total candidates
- how many candidates have been scored
- each interview's share link
- per-interview candidate counts
- pending vs scored candidates
- average overall score for scored candidates
- transcript entries for every question and follow-up
- marks for technical, communication, confidence, and overall

## 8. What The Candidate Sees

The candidate experience is intentionally narrow:

- no interviewer dashboard links
- no requirement to create a candidate account
- question-by-question interview UI
- timer and microphone controls
- optional early exit
- final scorecard after evaluation

## 9. How Scoring Works

After the interview ends:

- responses are read from stored candidate answers
- Azure OpenAI is asked to return structured JSON
- the app stores `technical`, `communication`, `confidence`, `overall`, and `feedback`
- if the AI call fails, a fallback scoring path is used

Scoring is meant to support hiring review, not replace human judgment.

## 10. Common Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 11. Troubleshooting

### Interview link shows 404

Most likely causes:

- you are running a different project on the same port
- the app is running on a different port than the link you opened
- the dev server needs a restart after file structure changes

Check which app owns port `3000` before assuming the route is missing.

### Sign-in works but dashboard shows config errors

Make sure these are set correctly:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Microphone does not start

Check:

- browser permission for microphone
- whether the browser supports speech recognition
- whether Azure Speech is configured if you selected Azure STT

### Speech output does not work

Check:

- browser speech support
- Azure Speech credentials
- `NEXT_PUBLIC_TTS_PROVIDER`

### AI features fail

Check:

- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`

## 12. Recommended Local Test Path

For a full manual smoke test:

1. Sign up as interviewer.
2. Create an interview.
3. Copy the share link.
4. Open the share link in another browser window.
5. Complete at least one answer.
6. End the interview early or finish normally.
7. Return to dashboard and confirm the transcript and score are visible.
