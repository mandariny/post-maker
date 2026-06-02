# Travel Blog Draft Automation MVP

React + Spring Boot 기반 여행 블로그 초안 자동화 MVP입니다.

## Stack

- Backend: Java 17, Spring Boot 3, Spring Security OAuth2 Client, Spring Data JPA
- Database: Supabase Postgres
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Providers: `StorageProvider`, `PlaceSearchProvider`, `LlmProvider`

## Supabase Project

현재 Codex Supabase MCP 인증으로 확인한 프로젝트:

- Project: `post-maker`
- Ref: `opamaqmxvpxvoloadynw`
- Region: `ap-northeast-2`

Spring Boot 앱과 테스트는 Supabase MCP를 런타임에 직접 호출하지 않습니다. MCP는 Codex가 Supabase 프로젝트를 관리/조회하는 개발 도구이고, 애플리케이션은 Supabase Postgres에 JDBC로 연결합니다.

## Environment

`.env.example`을 기준으로 환경변수를 설정합니다.

```bash
SUPABASE_DB_URL=jdbc:postgresql://db.opamaqmxvpxvoloadynw.supabase.co:5432/postgres
SUPABASE_DB_USERNAME=postgres
SUPABASE_DB_PASSWORD=...

SUPABASE_TEST_DB_URL=jdbc:postgresql://db.opamaqmxvpxvoloadynw.supabase.co:5432/postgres
SUPABASE_TEST_DB_USERNAME=postgres
SUPABASE_TEST_DB_PASSWORD=...
```

Supabase connection pooler를 쓰는 경우 `SUPABASE_DB_URL`과 username을 Supabase Dashboard의 Pooler 값으로 바꿉니다.

## Run

```bash
docker compose --env-file .env up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

## Backend Development

```bash
cd backend
mvn spring-boot:run
```

## Backend Tests

테스트도 H2가 아니라 Supabase Postgres를 사용합니다. `SUPABASE_TEST_DB_URL`, `SUPABASE_TEST_DB_USERNAME`, `SUPABASE_TEST_DB_PASSWORD`가 필요합니다.

```bash
cd backend
mvn test
```

주의: 테스트는 실제 Supabase DB에 데이터를 생성합니다. 별도 테스트 프로젝트나 테스트 전용 schema/database를 쓰는 것을 권장합니다.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

```bash
cd frontend
npm test
```

## MVP Scope

- Google OAuth login
- Trip CRUD
- Photo upload
- EXIF taken time/GPS extraction
- Google Places based place name estimation
- Date/place based grouping
- Place selection and memo UI
- LLM provider based Markdown draft generation
- Draft edit/save/copy
