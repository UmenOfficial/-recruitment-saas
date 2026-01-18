# Agent Instruction Manual (AGENTS.md)

Welcome, Jules (or other AI Agents). This document is your primary source of truth for working in this repository.

## 1. Project Context
This is a **Recruitment SaaS** platform built with Next.js 16 and Supabase. We focus on psychometric testing (Personality, Aptitude) and candidate management.
- **Current State**: RLS refactoring is mostly complete. We are in a stable maintenance and feature expansion phase.

## 2. Operational Commands
| Action | Command | Note |
|Str|Str|Str|
| Build | `npm run build` | Must pass without errors. |
| Dev Server | `npm run dev` | Runs on port 3000. |
| Lint | `npm run lint` | Zero-tolerance for errors. |
| DB Types | `npm run sync-db` | Run this after schema changes. |

## 3. Directory Structure
- `app/admin`: Admin dashboard and management (Secured).
- `app/candidate`: Candidate-facing test interface.
- `app/community`: Community board (Public/Secret posts).
- `lib/scoring.ts`: **CRITICAL**. Core psychometric scoring logic.
- `supabase/`: Migrations and seed data.
- `.agent/workflows`: Custom automated workflows.

## 4. Critical Files (Do Not Touch Without Approval)
- `lib/scoring.ts`: Modification risks invalidating all test results.
- `.cursorrules`: Governance rules.
- `next.config.ts`: Build configuration (keep `ignoreBuildErrors: false` ideally, currently discussed).

## 5. Collaboration Protocols
- **Context Handoff**: Always check `brain/walkthrough.md` to see what Antigravity (previous agent) did last.
- **Artifacts**: Store your plans and logs in `.gemini/antigravity/brain/` (or equivalent provided path).
- **Safety**: Do not delete data from `users` or `test_results` tables unless using the specific `delete` Server Actions provided in `app/*/actions.ts`.

## 6. Known Issues / Active Tasks
- Check `task.md` in the artifacts directory for the live todo list.
