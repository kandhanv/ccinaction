# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm run test

# Reset database
npm run db:reset
```

Single test: `npx vitest run src/path/to/file.test.ts`

## Environment

- `ANTHROPIC_API_KEY` — optional. Without it, a mock provider returns static components (Counter, Form, or Card depending on prompt keywords), capped at 4 steps.
- `JWT_SECRET` — optional, defaults to `"development-secret-key"`.

## Architecture

### Request flow for component generation

1. User types in `ChatInterface` → POST to `/api/chat` with messages + serialized virtual FS
2. Route handler (`src/app/api/chat/route.ts`) streams Claude Haiku 4.5 with two tools: `str_replace_editor` and `file_manager`
3. Tool calls are forwarded through `ChatContext` → `FileSystemContext` → `VirtualFileSystem`
4. After streaming, messages + file data are persisted to Prisma if a `projectId` was provided
5. `PreviewFrame` watches the FS via a refresh trigger; on change, `jsx-transformer.ts` compiles all files via Babel standalone into blob URLs, builds an import map, and injects the result into a sandboxed iframe with the Tailwind v4 CDN

### Virtual file system

`src/lib/file-system.ts` — all files live in memory (no disk writes). Key methods: `createFile`, `updateFile`, `deleteFile`, `rename`, `serialize`/`deserializeFromNodes` for Prisma persistence, `replaceInFile`/`insertInFile` for Claude tool operations.

### State management

Two React contexts wrap the entire app:

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — owns the `VirtualFileSystem` instance, selected file, and handles tool-call dispatch from the AI
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, connects to `/api/chat`, and forwards tool results to `FileSystemContext`

### Authentication

JWT sessions via `jose` (HS256, 7-day expiry, HTTP-only cookies). Server actions in `src/actions/index.ts` handle sign-up/sign-in/sign-out. Middleware at `src/middleware.ts` guards `/api/projects` and `/api/filesystem`. Anonymous users get localStorage-backed work via `src/lib/anon-work-tracker.ts`; it migrates to the DB on sign-in.

### UI layout

`src/app/main-content.tsx` renders a three-panel resizable layout (via `react-resizable-panels`): Chat (35%) | Preview or Code view (65%). Code view further splits into FileTree (30%) + Monaco editor (70%).

### Database

Prisma + SQLite (`prisma/dev.db`). Schema: `User` (email, bcrypt-hashed password) → `Project` (messages and file-system data stored as stringified JSON columns).

### JSX transformation

`src/lib/transform/jsx-transformer.ts` uses `@babel/standalone` to transpile JSX/TSX files, resolves `@/` alias imports, creates blob URLs for each file, and generates an HTML document with a native import map. Missing npm packages are mapped to `esm.sh` CDN URLs.

### Mock provider

`src/lib/provider.ts` — when no API key is present, returns a `MockLanguageModel` that inspects the last user message for keywords ("counter", "form", "card") and streams back a matching static component, simulating tool-call steps.

### System prompt

`src/lib/prompts/generation.tsx` — instructs Claude to always create `App.jsx` as the entry point, use `@/` alias for cross-file imports, and use Tailwind CSS for styling.
