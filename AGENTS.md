# odd-studio — Agent Configuration
# Powered by ODD Studio (Outcome-Driven Development)

## How to Start ODD

This project uses ODD Studio for planning and building. To activate the ODD coach:

**In Codex:** Type `use ODD`, `start ODD`, or `begin ODD` to start.
Use `ODD status` to check the current state before resuming, `ODD build` to continue the build flow, or `ODD debug` to investigate a failing outcome without leaving ODD.

**In OpenCode:** Type `/odd` to start.

When activated, read the full coaching protocol:
- `plugins/odd-studio/skills/odd/SKILL.md` (Codex) or `.opencode/odd/SKILL.md` (OpenCode)

Then execute the startup state check documented in that file.

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
- Use `ODD debug` or `*debug` when verification fails or a build breaks
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

## Stack Defaults (Override Only If Outcomes Require It)
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui
- Animation: Framer Motion
- Database: PostgreSQL via Drizzle ORM
- Auth: NextAuth.js
- Payments: Stripe
- Email: Resend
- Deployment: Vercel

## Session Start Protocol
Every new session begins with an explicit ODD kickoff.
In OpenCode, the primary entrypoint is `/odd`. In Codex, the primary triggers are `use ODD`, `start ODD`, or `begin ODD`.
Treat `ODD status` as the status check and `ODD build` as the build kickoff.
When you see one of these triggers, read the full coaching protocol from the skill file (see "How to Start ODD" above),
then execute the startup state check from that skill exactly as written.

Do not skip straight to persona naming or build questions.

If this is a new project:
- Display the full ODD Studio welcome message from the skill before asking any planning questions
- Wait for the user to begin planning, or if they clearly want to begin immediately, execute the `*plan` protocol
- When `*plan` routes to Diana for the first persona, Diana must first understand the product in plain language by asking:
  - What is this thing?
  - Who are the people involved?
  - Who has it hardest?
- After the user answers, summarise what they want to build before asking for the first persona name

If this is a returning project:
- Display the returning project status message from the skill
- Then continue from the appropriate ODD stage

Only after that should you use the session summary below when build work is already underway:
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

Available odd-flow tools: mcp__odd_flow__agent_spawn, mcp__odd_flow__memory_store,
mcp__odd_flow__memory_retrieve, mcp__odd_flow__task_create, mcp__odd_flow__coordination_sync

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
