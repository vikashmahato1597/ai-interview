# API Reference

This document describes the route handlers exposed by the application.

## Conventions

- All request bodies are JSON unless otherwise noted.
- Validation is performed with Zod.
- Errors are returned as JSON with an `error` field.

## `POST /api/auth/sign-up`

Creates a new user through the Supabase admin API.

### Request

```json
{
  "fullName": "Jane Recruiter",
  "email": "jane@company.com",
  "password": "strong-password",
  "role": "interviewer"
}
```

### Response

```json
{
  "id": "uuid",
  "email": "jane@company.com",
  "role": "interviewer"
}
```

## `POST /api/generate-questions`

Generates interview questions using Azure OpenAI.

### Request

```json
{
  "title": "Senior Full-Stack Engineer",
  "topic": "Distributed systems and web platform architecture",
  "difficulty": "medium",
  "count": 5
}
```

### Response

```json
{
  "questions": [
    {
      "prompt": "Question text",
      "source": "ai",
      "difficulty": "medium",
      "rationale": "Why this question was created"
    }
  ]
}
```

## `POST /api/interviews`

Creates and publishes an interview for the signed-in interviewer.

### Request

```json
{
  "title": "Senior Full-Stack Engineer",
  "topic": "Distributed systems and web platform architecture",
  "difficulty": "medium",
  "questions": [
    {
      "prompt": "Walk me through a production API you designed end to end.",
      "source": "manual",
      "difficulty": "medium",
      "rationale": null
    }
  ]
}
```

### Response

```json
{
  "id": "uuid",
  "slug": "senior-full-stack-engineer-abc123",
  "title": "Senior Full-Stack Engineer",
  "topic": "Distributed systems and web platform architecture",
  "difficulty": "medium",
  "shareUrl": "/interview/senior-full-stack-engineer-abc123",
  "questionCount": 5,
  "absoluteShareUrl": "http://localhost:3000/interview/senior-full-stack-engineer-abc123"
}
```

## `POST /api/start-interview`

Creates a candidate session and returns the first question.

### Request

```json
{
  "interviewSlug": "senior-full-stack-engineer-abc123",
  "name": "Candidate Name",
  "email": "candidate@example.com"
}
```

### Response

```json
{
  "candidateId": "uuid",
  "interview": {
    "id": "uuid",
    "interviewerId": "uuid",
    "slug": "senior-full-stack-engineer-abc123",
    "title": "Senior Full-Stack Engineer",
    "topic": "Distributed systems and web platform architecture",
    "difficulty": "medium",
    "questionCount": 5
  },
  "question": {
    "text": "First question text",
    "sequence": 1,
    "total": 5,
    "source": "base"
  },
  "voice": {
    "ttsProvider": "azure",
    "sttProvider": "azure",
    "hasAzureSpeech": true,
    "hasRetell": false
  }
}
```

## `POST /api/submit-answer`

Stores one candidate answer.

### Request

```json
{
  "candidateId": "uuid",
  "answerText": "My answer text",
  "answerDurationSeconds": 42,
  "transcriptMeta": {
    "source": "web-speech-api"
  }
}
```

### Response

```json
{
  "ok": true
}
```

## `POST /api/next-question`

Decides whether to ask a follow-up question, move to the next question, or complete the interview.

### Request

```json
{
  "candidateId": "uuid"
}
```

### Response When Continuing

```json
{
  "complete": false,
  "question": {
    "text": "Next question text",
    "sequence": 2,
    "total": 5,
    "source": "follow_up"
  },
  "voice": {
    "ttsProvider": "azure",
    "sttProvider": "azure",
    "hasAzureSpeech": true,
    "hasRetell": false
  }
}
```

### Response When Complete

```json
{
  "complete": true,
  "result": {
    "technical": 8.1,
    "communication": 7.8,
    "confidence": 7.5,
    "overall": 7.8,
    "feedback": "Concise summary"
  },
  "voice": {
    "ttsProvider": "azure",
    "sttProvider": "azure",
    "hasAzureSpeech": true,
    "hasRetell": false
  }
}
```

## `POST /api/evaluate`

Forces evaluation of an existing candidate session.

### Request

```json
{
  "candidateId": "uuid"
}
```

### Response

```json
{
  "result": {
    "technical": 8.1,
    "communication": 7.8,
    "confidence": 7.5,
    "overall": 7.8,
    "feedback": "Concise summary"
  }
}
```

## `POST /api/end-interview`

Ends a candidate interview early, marks the session complete, and evaluates only the answers already recorded.

### Request

```json
{
  "candidateId": "uuid"
}
```

### Response

```json
{
  "result": {
    "technical": 7.4,
    "communication": 7.2,
    "confidence": 7.0,
    "overall": 7.2,
    "feedback": "Summary based on recorded answers"
  }
}
```

## `GET /api/speech-token`

Issues a short-lived Azure Speech token for browser speech SDK usage.

### Response

```json
{
  "token": "token-string",
  "region": "eastus",
  "voiceName": "en-US-AvaMultilingualNeural",
  "expiresAt": 1730000000000
}
```

## Error Shape

Typical error response:

```json
{
  "error": "Human-readable message"
}
```

When validation fails, some routes also return:

```json
{
  "error": "Invalid payload.",
  "details": {
    "fieldErrors": {},
    "formErrors": []
  }
}
```
