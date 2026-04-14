# {{PROJECT_NAME}} — Claude Code Configuration
# Powered by ODD Studio (Outcome-Driven Development)

## Project Context
This project is built using Outcome-Driven Development. All build decisions flow from the
outcomes documented in `docs/outcomes/` and the plan in `docs/plan.md`.

Before starting any build session, read:
1. `docs/plan.md` — the Master Implementation Plan
2. `docs/outcomes/` — all outcome documents for the current phase
3. `docs/architecture.md` — technical architecture (authoritative stack and infrastructure reference)
4. `docs/ui/design-system.md` — design system (authoritative design reference — palette, typography, components, layout)
5. `docs/contract-map.md` — contracts and dependency graph
6. `.odd/state.json` — current project state

## ODD Build Rules (Always Enforced)

### Language
- Describe problems and verify results in **domain language only**
- Never explain what code does — explain what the *user experiences*
- When reporting failures: "the dietary requirement I entered doesn't appear on the dashboard"
  NOT: "the database column is null"

### Build Sequence
- NEVER build an outcome whose dependencies are not yet verified
- ALWAYS build shared infrastructure before individual outcomes
- ALWAYS run `npm test` after building and before verification — failing tests block verification
- ALWAYS write tests for pure-logic modules (business rules, calculations, parsing, safety-critical logic)
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

### Code Excellence — The Three Laws
1. **Solve it, then halve it.** Write every solution twice internally. First pass: make it work. Second pass: make it minimal. Commit only the second pass.
2. **Every line earns its place.** No defensive code for scenarios not in the outcome. No abstractions with one implementation. No comments restating the code. No wrappers that add no logic.
3. **Name things so well that comments are unnecessary.** `activeStudentsInClass` needs no comment. `data` always does. When tempted to write a comment, rename the thing instead.

### Code Excellence — Quantitative Limits
- Function body: **25 lines max** — longer means it does more than one thing
- Function parameters: **4 max** — more means the design is wrong
- File length: **300 lines max** — elegance demands shorter files
- Nesting depth: **3 levels max** — flatten with early returns
- Components per file: **1 exported + 2 private max**
- Imports per file: **8 max** — more means too much coupling

### Code Excellence — Mandatory Examples

**GOOD — we write code like this:**
```typescript
const activeStudents = students.filter(s => s.isActive)
const sorted = activeStudents.sort((a, b) => a.name.localeCompare(b.name))
const displayNames = sorted.map(s => `${s.firstName} ${s.lastName}`)
```

**BAD — we never write code like this:**
```typescript
// Filter to only get active students
const result = students
  .filter(student => {
    // Check if the student is active
    if (student.isActive === true) {
      return true
    }
    return false
  })
  // Sort students alphabetically
  .sort((a, b) => {
    return a.name.localeCompare(b.name)
  })
  .map(student => {
    const displayName = `${student.firstName} ${student.lastName}`
    return displayName
  })
```

**GOOD — direct returns, no wrapping:**
```typescript
export function canAccess(user: User): boolean {
  return user.role === "teacher" && user.isVerified
}
```

**BAD — unnecessary conditional, unnecessary variable:**
```typescript
export function canAccess(user: User): boolean {
  const hasAccess = user.role === "teacher" && user.isVerified
  if (hasAccess) {
    return true
  }
  return false
}
```

### Code Excellence — Banned Patterns
- **"Just in case" code** — no error handling for errors that cannot occur
- **Abstraction-first** — no generic utilities until there are two concrete uses
- **Wrapper components** — if `<PrimaryButton>` just renders `<Button variant="primary">`, use `<Button variant="primary">`
- **Premature types** — no type definitions for structures used once in one place
- **Defensive copies** — no spreading or cloning when nothing mutates

### Security Baseline
- No hardcoded secrets, API keys, or credentials — use environment variables
- Validate user input at system boundaries
- Authenticate and authorise every protected route, action, webhook, and admin surface
- Verify webhooks, uploads, and third-party callbacks before trusting payloads
- Use secure session defaults — no localStorage auth/session tokens, no JWT-by-default shortcuts
- Rate-limit auth, admin, upload, payment, and public write surfaces
- Record audit trails for admin and security-sensitive actions
- Never disable TLS, CSRF, origin, or certificate verification in production code
- Treat any security scan finding as release-blocking until fixed

## Debugging Inside ODD
- Use `*debug` when verification fails or a build breaks
- Debugging stays inside the current outcome — it is not a free-form detour
- Choose an explicit debug strategy before touching code: `ui-behaviour`, `full-stack`, `auth-security`, `integration-contract`, `background-process`, or `performance-state`
- Reproduce first, identify the failing boundary second, fix third
- Never apply a “quick fix” without naming the failing boundary
- After a fix, return to the verification walkthrough from step one

## UI Standards (Every UI Outcome)
- Use shadcn/ui components as the default component library
- Style with Tailwind CSS — no inline styles, no hardcoded colours
- Every interactive element must be keyboard-navigable
- Every image must have meaningful alt text
- Every form must work without JavaScript (progressive enhancement)
- Verify on 375px screen width before marking any UI outcome complete
- WCAG 2.1 AA is the minimum accessibility standard

## Technical Stack (see docs/architecture.md for full detail)
_This section is populated by Rachel during Step 9 of the planning phase._
_Until then, the ODD defaults apply:_
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui
- Database: PostgreSQL via Drizzle ORM
- Auth: NextAuth.js
- Testing: Vitest (default — chosen during Step 9)
- Email: Resend
- Deployment: Vercel

## Build & Test
```bash
npm run dev       # Development server
npm run build     # Production build
npm test          # Run test suite (must pass before verification)
npm run test:watch # Watch mode during development
npm run lint      # Lint
```

## Design Approach (see docs/ui/design-system.md for full detail)
_This section is populated by Rachel during Step 9b of the planning phase._

## Session Start Protocol
Every new Claude Code session begins with:
```
Read docs/plan.md and docs/outcomes/. We are in Phase [X].
Phase [A...] is complete and verified.
We are [starting/continuing] Outcome [N]: [name].
[If continuing: Stage [X] is complete. Continue from Stage [X+1].]
Confirm you understand the current state before we begin.
```

## Swarm Build Protocol (odd-flow)
When building multiple independent outcomes in the same phase, use odd-flow for parallel agent coordination:
- Spawn a Coordinator agent to publish shared contracts before concurrent building
- Spawn specialist agents: Backend, UI, QA
- All agents report failures in domain language
- QA agent runs full verification walkthrough after each outcome

Available odd-flow tools: mcp__odd-flow__agent_spawn, mcp__odd-flow__memory_store,
mcp__odd-flow__memory_retrieve, mcp__odd-flow__task_create, mcp__odd-flow__coordination_sync

## File Organisation
- `docs/personas/` — persona documents (never delete)
- `docs/outcomes/` — outcome documents (never delete)
- `docs/plan.md` — Master Implementation Plan (update status after each outcome)
- `docs/contract-map.md` — contracts and dependency graph
- `docs/architecture.md` — technical architecture document (generated by Rachel Step 9d)
- `docs/ui/design-system.md` — design system document (generated by Rachel Step 9d)
- `docs/ui/` — UI specifications per outcome
- `docs/session-brief-[N].md` — phase-specific session briefs for build handoff
- `.odd/state.json` — project state (updated by hooks automatically)
- `src/` — all source code
- `tests/` — all test files
