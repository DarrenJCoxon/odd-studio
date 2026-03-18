# {{PROJECT_NAME}} — Claude Code Configuration
# Powered by ODD Studio (Outcome-Driven Development)

## Project Context
This project is built using Outcome-Driven Development. All build decisions flow from the
outcomes documented in `docs/outcomes/` and the plan in `docs/plan.md`.

Before starting any build session, read:
1. `docs/plan.md` — the Master Implementation Plan
2. `docs/outcomes/` — all outcome documents for the current phase
3. `.odd/state.json` — current project state

## ODD Build Rules (Always Enforced)

### Language
- Describe problems and verify results in **domain language only**
- Never explain what code does — explain what the *user experiences*
- When reporting failures: "the dietary requirement I entered doesn't appear on the dashboard"
  NOT: "the database column is null"

### Build Sequence
- NEVER build an outcome whose dependencies are not yet verified
- ALWAYS build shared infrastructure before individual outcomes
- ALWAYS run the full verification walkthrough before marking an outcome complete
- ALWAYS commit after each verified outcome with message: "Outcome [N] [name] — verified"

### Verification Standard
- Every outcome must be verified by walking through the verification steps in a browser
- Pass = works exactly as the walkthrough describes
- Fail = describe the failure in domain language, fix, re-verify the ENTIRE outcome
- An outcome is not done until every verification step passes

### Git Discipline
- Commit after every verified outcome (not before)
- Commit message format: `Outcome [N] [name] — verified` or `Phase [X] complete`
- Never force-push. Never commit .env files. Never skip hooks.
- If tests fail, fix them — never use --no-verify

### Code Quality
- No hardcoded secrets, API keys, or credentials — use environment variables
- Validate user input at system boundaries
- No magic numbers — extract all constants to config
- Keep files under 500 lines

## UI Standards (Every UI Outcome)
- Use shadcn/ui components as the default component library
- Style with Tailwind CSS — no inline styles, no hardcoded colours
- Every interactive element must be keyboard-navigable
- Every image must have meaningful alt text
- Every form must work without JavaScript (progressive enhancement)
- Verify on 375px screen width before marking any UI outcome complete
- WCAG 2.1 AA is the minimum accessibility standard

## Stack Defaults (Override Only If Outcomes Require It)
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui
- Animation: Framer Motion
- Database: PostgreSQL via Prisma ORM
- Auth: NextAuth.js
- Payments: Stripe
- Email: Resend
- Deployment: Vercel

## Session Start Protocol
Every new Claude Code session begins with:
```
Read docs/plan.md and docs/outcomes/. We are in Phase [X].
Phase [A...] is complete and verified.
We are [starting/continuing] Outcome [N]: [name].
[If continuing: Stage [X] is complete. Continue from Stage [X+1].]
Confirm you understand the current state before we begin.
```

## Swarm Build Protocol (Ruflo)
When building multiple independent outcomes in the same phase, use ruflo for parallel agent coordination:
- Spawn a Coordinator agent to publish shared contracts before concurrent building
- Spawn specialist agents: Backend, UI, QA
- All agents report failures in domain language
- QA agent runs full verification walkthrough after each outcome

Available ruflo tools: mcp__ruflo__agent_spawn, mcp__ruflo__memory_store,
mcp__ruflo__memory_retrieve, mcp__ruflo__task_create, mcp__ruflo__coordination_sync

## File Organisation
- `docs/personas/` — persona documents (never delete)
- `docs/outcomes/` — outcome documents (never delete)
- `docs/plan.md` — Master Implementation Plan (update status after each outcome)
- `docs/contract-map.md` — contracts and dependency graph
- `docs/ui/` — UI specifications per outcome
- `docs/session-brief.md` — generated session brief for handoff
- `.odd/state.json` — project state (updated by hooks automatically)
- `src/` — all source code
- `tests/` — all test files
