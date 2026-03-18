# ODD Studio — Build Protocol

The Build Protocol is the discipline that turns a well-written ODD plan into working software. Without it, builds drift. With it, every session starts from a known position, every outcome produces verified software, and every phase ends with a coherent, integrated system.

The protocol has 4 levels. They nest: sessions contain phases, phases contain outcomes, phases end with integration. You apply the right level at the right moment — you do not skip levels and you do not invent your own steps.

---

## Level 1 — Session Protocol

### Why sessions need a protocol

Claude Code does not remember yesterday. Every time you open a new conversation, you are talking to someone who has never heard of your project. If you start typing "can you add the approval button to the teacher dashboard", you will get a response from someone who does not know what approval means in your domain, what the teacher dashboard is, or what state the code is in.

The Session Protocol solves this. It takes 3 minutes to run and saves 15 minutes of confused AI behaviour.

---

### Step 1 — Re-orient Claude Code at the start of every session

Open Claude Code. Before you describe any work, paste this block and fill in the blanks:

```
I am continuing work on [PROJECT NAME].

This is an Outcome-Driven Development project. My ODD plan is in [PATH TO PLAN FILE].

Please read the plan now so you understand the domain, the personas, the outcomes, and the contracts.

My last session note is below. Read it carefully.

[PASTE YOUR LAST HANDOVER NOTE HERE]

The code is in [PATH TO CODEBASE]. The current state is:
- Last completed outcome: [OUTCOME NAME OR "none"]
- Current phase: [PHASE NAME]
- Outstanding issues: [DESCRIBE IN DOMAIN LANGUAGE OR "none"]

Before we build anything, confirm you have read the plan and the handover note.
```

Do not skip the confirmation step. If Claude Code summarises what it read and the summary is wrong, correct it before proceeding.

---

### Step 2 — Restore session state with Ruflo

If you are using Ruflo for swarm coordination (recommended for phases with 3+ outcomes), restore state immediately after re-orienting:

```
Restore the Ruflo session state for this project using:
- mcp__ruflo__session_restore with session key 'odd-[project-name]-session'
- mcp__ruflo__memory_retrieve with key 'odd-project-state'

Report back what you find.
```

Ruflo memory persists between sessions. It stores what agents built, what contracts were published, and what decisions were made. Claude Code reads this and resumes from where the swarm left off.

If `memory_retrieve` returns nothing, the project is starting fresh or state was not saved. Proceed with your handover note as the source of truth.

---

### Step 3 — The handover note system

At the end of every session, you write a handover note. It takes 15 seconds. It saves the next session from 15 minutes of confusion.

**The handover note template:**

```
SESSION NOTE — [DATE] [TIME]

Completed this session:
- [List outcomes or sub-tasks completed, in plain language]

State of the code:
- Last committed outcome: [OUTCOME NAME]
- Uncommitted work: [DESCRIBE OR "none"]
- Build is: passing / broken / partially broken

Open issues:
- [Describe any problem that was not resolved, in domain language]
- [Example: "The fee calculation rounds to the wrong decimal in the invoice preview"]

Next session should start with:
- [The first thing to do, described clearly]
- [Any Claude Code instruction that needs to be given immediately]

Anything Claude Code needs to know:
- [Rules discovered during this session, e.g. "Do not use server actions for the invoice endpoint — use API routes instead"]
```

Save this note as a text file in your project folder (e.g. `/docs/session-notes/2026-03-17.md`). You will paste the relevant note into your session start template every time.

---

### Step 4 — Close a session cleanly

Before you close Claude Code, do three things in order:

**1. Commit what works.**

Ask Claude Code:
```
Commit everything that is currently verified and working. Use the format:
"Outcome [N] [name] — verified"
or if mid-outcome:
"WIP: [describe what is done in plain language]"

Do not commit broken code without labelling it WIP.
```

**2. Write your handover note.**

Fill in the template above. Do not skip this. You will not remember tomorrow what you know now.

**3. Save state to Ruflo.**

```
Save the current project state to Ruflo memory using:
- mcp__ruflo__memory_store with key 'odd-project-state'

Include: last completed outcome, current phase, any open issues, and the file path of today's session note.
```

---

## Level 2 — Phase Protocol

### What a phase is

A phase is a group of outcomes that, taken together, produce a coherent capability. The Session Protocol tells you how to start and stop. The Phase Protocol tells you how to build a group of outcomes without the pieces colliding.

---

### Step 1 — Verify previous phase dependencies

Before building anything in this phase, ask:

```
Read the ODD plan. List every contract this phase depends on that was built in a previous phase.

For each contract, verify:
1. Does the code or database schema for this contract exist?
2. Does it match what the plan specifies?

Report back as a table: Contract | Exists | Matches Plan | Gap (if any)
```

Do not start building until every dependency is confirmed. If a contract is missing or wrong, fix it before proceeding. A phase built on a false assumption will require expensive rework.

---

### Step 2 — Identify shared infrastructure for this phase

Look at the outcomes in this phase. Some will share infrastructure: the same database table, the same authentication check, the same email provider, the same API endpoint.

If you try to build each outcome independently, two agents will build the same table differently. They will not connect. This is the "two architects, one door" problem.

Ask:

```
Read the outcomes in Phase [N]. Identify all shared infrastructure:
- Shared database tables or schemas
- Shared API endpoints
- Shared authentication logic
- Shared email or notification services
- Shared UI components used by multiple outcomes

List each shared item and which outcomes use it.
```

---

### Step 3 — Brief the Coordinator agent

When using Ruflo for a phase with multiple outcomes, the Coordinator agent runs first. Its job is to read all the outcome contracts and publish shared technical contracts before any building begins.

Initialise the swarm:

```
Initialise a Ruflo swarm for Phase [N] of [PROJECT NAME]:
mcp__ruflo__swarm_init with topology hierarchical and max-agents 6

Then spawn a Coordinator agent:
mcp__ruflo__agent_spawn with type hierarchical-coordinator and name "phase-[N]-coordinator"

Brief the Coordinator with:
- The ODD plan (attach file path)
- The list of outcomes in this phase
- The list of shared infrastructure identified above
- The instruction: "Read all outcome contracts. Publish shared technical contracts — database schemas, API shapes, component interfaces — to Ruflo memory before any other agent begins work."
```

Wait for the Coordinator to confirm contracts are published before proceeding to parallel building.

---

### Step 4 — Verify shared infrastructure before building outcomes

After the Coordinator has published contracts:

```
Retrieve the shared contracts from Ruflo:
mcp__ruflo__memory_retrieve with key 'odd-phase-[N]-contracts'

Confirm the contracts match the ODD plan. If anything is missing or wrong, correct it now.
```

Then proceed to Level 3 for each outcome.

---

### Step 5 — After all outcomes: run Integration Protocol

When all outcomes in the phase are individually verified, run Level 4. Do not skip it. Individual outcomes that pass their own verification steps can still fail to connect.

---

## Level 3 — Outcome Protocol

### Step 1 — Decide whether to stage the build

Some outcomes are simple: one screen, one action, one data change. Build them in one shot.

Some outcomes involve more than 2 context shifts. A context shift is any moment where the work moves from one layer to another: from database to API, from API to UI, from UI to email notification, from one persona's view to another's.

**Rule: if an outcome has more than 2 context shifts, stage the build.**

Staging means you build in sub-steps and verify each one before moving to the next. You tell Claude Code:

```
Build this outcome in stages. First build only the data layer. Verify it. Then build the API layer. Verify it. Then build the UI.
```

This is slower but it is almost always faster overall — because a bug found at the UI layer that originates in the data layer requires rebuilding everything above it.

---

### Step 2 — Give Claude Code the full outcome brief

Paste all 6 fields of the outcome directly into Claude Code. Do not paraphrase. Do not summarise. The exact language in the outcome document is the specification.

```
Build the following outcome. Do not begin until you have read all 6 fields.

OUTCOME NAME: [name]
PERSONA: [persona name and description]
TRIGGER: [what causes this outcome to begin]
EXPERIENCE: [what the persona does and sees, in full]
CONTRACTS CONSUMED: [list of contracts this outcome uses as inputs]
CONTRACTS EXPOSED: [list of contracts this outcome produces as outputs]

Stack: Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, PostgreSQL/Prisma, NextAuth.js.

Build the full outcome. Use the domain language throughout — file names, variable names, component names must reflect the domain, not generic terms.
```

---

### Step 3 — Ruflo parallel building

For outcomes that are large enough to benefit from parallelism, spawn 3 agents simultaneously after the Coordinator has published contracts:

```
Spawn three agents in parallel:

1. Backend agent (mcp__ruflo__agent_spawn, type coder, name "outcome-[N]-backend"):
   Brief: "Implement the data layer for Outcome [N] per the shared contracts. Build: Prisma schema, database migrations, API routes or server actions. Use domain language for all names."

2. UI agent (mcp__ruflo__agent_spawn, type coder, name "outcome-[N]-ui"):
   Brief: "Implement the UI for Outcome [N] per the shared contracts and the full outcome walkthrough. Use shadcn/ui components, Tailwind CSS v4, Framer Motion for interactions. Mobile-first. WCAG 2.1 AA."

3. QA agent (mcp__ruflo__agent_spawn, type tester, name "outcome-[N]-qa"):
   Brief: "Write verification tests for Outcome [N]. Follow the walkthrough exactly. Return results in domain language — describe failures as '[persona] cannot [action]', not as error codes."

Sync state between agents using mcp__ruflo__coordination_sync.
```

Wait for all three agents to return before running the shape check.

---

### Step 4 — Shape check

Before running a full verification walkthrough, do a fast shape check:

```
Check the shape of what was built for Outcome [N]:
1. List all files created or modified.
2. Confirm file names use domain language (not generic names like "form.tsx" or "handler.ts").
3. Confirm a test file exists for this outcome.
4. Confirm the Prisma schema (if applicable) uses domain field names.

Return: Pass / Needs fix for each item, with specific details.
```

Fix shape issues before verifying behaviour. A correctly-shaped codebase is far easier to debug.

---

### Step 5 — Verification walkthrough

The walkthrough in your outcome document is the script for verification. Run it literally, step by step. Do not improvise.

For each step in the walkthrough:

```
Verify Step [N]: [copy the step text from the outcome document]

Expected: [what should happen]
Actual: [what actually happened]
Result: Pass / Fail / Missing
```

Run every step even if an earlier step fails. Collect all failures before asking Claude Code to fix anything.

---

### Step 6 — Describing failures in domain language

This is where most non-technical builders struggle. They describe failures using technical terms they do not fully understand, and Claude Code misdiagnoses the problem.

**Bad failure description:**
"The API is returning a 500 error on the POST endpoint and the state is not updating."

**Good failure description:**
"When the mentor clicks Approve on a student's application, nothing changes on screen. The application stays in Pending. If I refresh the page, the application is still Pending — so the approval did not save. The success message appeared briefly but then disappeared."

The good description tells Claude Code:
- What persona performed the action
- What the action was in domain terms
- What should have changed
- What actually changed (or did not)
- Whether the problem is display-only or persisted to data

Always describe failures from the persona's point of view. If you saw an error message, copy it exactly. If you saw nothing, say you saw nothing.

---

### Step 7 — Re-verify the entire outcome after fixes

When Claude Code fixes a failure, re-run the entire walkthrough from step 1. Not just the step that failed.

Fixes frequently introduce new problems. A fix to the approval logic may break the notification email. A fix to the UI display may break the mobile layout. You will not catch these if you only re-run the failed step.

---

### Step 8 — Commit when verified

```
Commit this outcome. Message format:
"Outcome [N] [name] — verified"

Include all files related to this outcome. Do not include files from other outcomes in the same commit.
```

Save state to Ruflo:

```
mcp__ruflo__memory_store with key 'odd-build-state'
Include: outcome [N] complete, contracts exposed, date, any decisions made during build.
```

---

## Level 4 — Integration Protocol

### When to run it

Run the Integration Protocol after all outcomes in a phase are individually verified. Do not run it after each outcome — it is designed for the seams between outcomes, and those seams only become visible when all the pieces exist.

---

### Handshake test

For every pair of outcomes where one exposes a contract and the other consumes it, run a handshake test:

```
Handshake test: Outcome [A] → Outcome [B]

Contract: [name the contract being passed]

Test:
1. Perform the action in Outcome A that produces the contract data.
2. Navigate to Outcome B.
3. Confirm the data produced in Outcome A is visible and correct in Outcome B.

Expected: [describe in domain language what should appear]
Actual: [what appeared]
Result: Pass / Fail
```

---

### Data flow trace

Pick your most important domain entity (the thing your system revolves around: the application, the booking, the order, the assessment). Follow it through every outcome that touches it:

```
Trace the [ENTITY] through all outcomes in Phase [N]:

For each outcome that touches this entity:
1. How does the entity enter this outcome?
2. What changes to it?
3. How does it leave this outcome?
4. Is the data consistent at every stage?

Report any inconsistency.
```

---

### Cross-persona check

If your phase involves more than one persona, verify that each persona sees what they should see and cannot see what they should not:

```
Cross-persona check for Phase [N]:

For each persona:
1. Log in as this persona (or simulate their session).
2. Confirm they can see everything the plan specifies they should see.
3. Confirm they cannot see data belonging to other personas.
4. Confirm they cannot perform actions reserved for other personas.

Report as: Persona | Can see [X] | Cannot see [Y] | Pass/Fail
```

---

### Fix failures and re-run

Describe any integration failures in domain language (same rule as outcome failures). Ask Claude Code to fix them. Then re-run the handshake tests for every outcome affected by the fix — not just the test that failed.

---

### Phase commit

```
Commit Phase [N] completion. Message format:
"Phase [N] [name] — integrated and verified"

This commit should contain only the integration fixes, not the individual outcome builds (those were committed separately).
```

Save phase state to Ruflo:
```
mcp__ruflo__memory_store with key 'odd-phase-[N]-complete'
Include: all outcomes completed, contracts exposed by this phase, integration test results.
```

---

## Common Build Problems

### "The AI built the wrong thing"

This happens when the brief was too short or used generic language. Do not say "it built the wrong thing" to Claude Code — this tells it nothing useful.

Instead, describe what you expected and what appeared:

```
This is not the correct build. Here is what I expected:

Persona: [name]
Action: [what they do]
Expected result: [what should appear, step by step]

What appeared instead:
[Describe what you see on screen or in the code]

Please read the outcome document again in full, then rebuild to match it exactly.
```

---

### "The build broke something that was working"

Before asking Claude Code to fix the new breakage, understand what changed:

```
Something that was working is now broken. Before making any changes:

1. Run git log --oneline -10 to show recent commits.
2. Run git diff HEAD~1 to show what changed in the last commit.
3. Tell me in plain language what files changed and what the changes were.

I will then describe what is now broken, and we will trace the cause.
```

Only after you understand what changed should you attempt a fix. Fixing without understanding the cause usually breaks something else.

---

### "The AI keeps making the same mistake"

If Claude Code makes the same mistake twice, the solution is a rule in CLAUDE.md, not repeated correction.

Ask:
```
You have now made this mistake twice: [describe the mistake in domain language].

Write a clear rule for CLAUDE.md that prevents this from happening again.
The rule should describe the correct approach, not just forbid the wrong one.
```

Then add the rule to CLAUDE.md. Claude Code reads this file at the start of every session.

---

### "Two outcomes were built at the same time and they do not connect"

This is the "two architects, one door" problem. It happens when parallel agents build overlapping things without agreeing on the shared interface first.

The fix is always the same: define the shared contract explicitly, then have both sides conform to it.

```
Two outcomes do not connect at [the seam point — e.g. the student record].

Please:
1. Show me exactly how Outcome A produces this data (the shape of what it writes or returns).
2. Show me exactly how Outcome B expects to receive this data (the shape it reads).
3. Identify the difference.
4. Write a shared contract definition that both can conform to.
5. Update both outcomes to use this shared contract.
```

Save the fixed contract to Ruflo so future agents can read it:
```
mcp__ruflo__memory_store with key 'odd-contract-[contract-name]'
```
