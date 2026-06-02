# Travel Blog Draft Automation MVP

React + Supabase + OpenAI API 기반 여행 블로그 초안 자동화 MVP입니다. Spring Boot 백엔드는 사용하지 않습니다.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Auth: Supabase Auth with Google OAuth
- Database: Supabase Postgres
- Storage: Supabase Storage bucket `trip-photos`
- Serverless: Supabase Edge Functions
- AI: OpenAI API
- Place Search: Google Places API

## Supabase Project

- Project: `post-maker`
- Ref: `opamaqmxvpxvoloadynw`
- Region: `ap-northeast-2`

## Required Environment

Frontend:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Supabase Edge Function secrets:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
GOOGLE_PLACES_API_KEY=...
```

## Setup

Apply schema and Storage/RLS policies:

```bash
supabase link --project-ref opamaqmxvpxvoloadynw
supabase db push
```

Deploy Edge Functions:

```bash
supabase functions deploy guess-place
supabase functions deploy generate-blog-draft
supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=gpt-4.1-mini GOOGLE_PLACES_API_KEY=...
```

Enable Google provider in Supabase Auth and add the frontend URL to Auth redirect URLs.

## Run

```bash
cd frontend
npm install
npm run dev
```

Docker static frontend:

```bash
docker compose --env-file .env up --build
```

## Test

```bash
cd frontend
npm test
npm run build
```

## MVP Flow

1. User signs in with Supabase Google OAuth.
2. User creates a trip record.
3. User uploads travel photos to Supabase Storage.
4. Browser extracts EXIF taken time and GPS.
5. Edge Function calls Google Places API for place names when GPS exists.
6. App stores photos and rebuilds date/place groups in Supabase Postgres.
7. User selects places and writes place-level notes.
8. Edge Function calls OpenAI API to generate a Markdown draft.
9. User edits, saves, and copies the draft.
