# ODD Studio

**Outcome-Driven Development for Claude Code.**

A planning and build harness for domain experts who are building serious software with AI — and want to understand exactly what they're doing and why.

---

## What this is

ODD Studio turns Claude Code into a guided coach that takes you through every stage of building a real software system: from understanding your users, to specifying what the system must do, to directing an AI to build it correctly, to verifying that what was built matches what you intended.

You don't need to write code. You need to understand your domain. That's the skill that matters now.

> *"The AI is the most capable junior engineer who ever lived. It can build anything you describe. It will build exactly what you describe. It will not tell you that what you described is the wrong thing to build. That judgement remains entirely yours."*

ODD Studio is the companion tool to **The ODD Way to Build Software with Agentic AI** — the book that teaches Outcome-Driven Development from first principles (book currently in development). Every step in the tool references the relevant chapter. You'll understand the method as you use it, not just follow instructions.

---

## Install

```bash
npx odd-studio init my-project   # one-command setup                                                                     
```
or 
```bash                                                                   
npm install -g odd-studio        # global install 
```
That's it. This single command:

- Scaffolds your project structure (`docs/`, `.odd/`, `CLAUDE.md`)
- Installs the `/odd` skill into Claude Code
- Installs six safety hooks into your Claude Code settings
- Initialises git with an initial commit
- Prints your three next steps

**Then:**

```bash
cd my-project
claude .
```

Inside Claude Code, type:

```
/odd
```

---

## What happens when you type `/odd`

Claude Code loads the ODD orchestrator. It checks whether you have an existing project in progress (via your local `.odd/state.json` and ruflo memory) and either:

- **New project:** Welcomes you, explains what you're about to build together, and starts with the first question: *Who uses this system, and what do they actually need?*
- **Returning project:** Shows you exactly where you left off and resumes from there. Nothing is lost between sessions.

---

## The five stages

ODD Studio guides you through five stages, in order. You cannot skip ahead — each stage is the foundation for the next.

```
Stage 1 — Personas
  Who uses your system? Under what constraints?
  Built by: Diana (Persona Architect)
  Output: docs/personas/[name].md for each user type

Stage 2 — Outcomes
  What must the system make possible, for whom, when, and how?
  Built by: Marcus (Outcome Writer)
  Output: docs/outcomes/[name].md for each workflow

Stage 3 — Contracts
  What does each outcome produce that others depend on?
  Built by: Theo (Systems Mapper)
  Output: docs/contract-map.md

Stage 4 — Master Implementation Plan
  What gets built in what order, and why?
  Built by: Rachel (Build Planner)
  Output: docs/plan.md

Stage 5 — Build
  Direct Claude Code to build outcome by outcome, verify each one,
  and integrate them into a working system.
  Powered by: ruflo swarm (parallel specialist agents)
```

At every step, the tool explains why the step matters — not just what to do.

---

## The safety layer

ODD Studio installs six hooks into Claude Code that run automatically throughout your build:

| Hook | When | What it does |
|------|------|-------------|
| `odd-git-safety` | Before any bash command | Blocks force-push, hard-reset with uncommitted changes, `git checkout -- .`, `--no-verify` |
| `odd-destructive-guard` | Before any bash command | Blocks `rm -rf` on project docs, `.env` commits, database drops without warning |
| `odd-outcome-quality` | After writing to `docs/outcomes/` | Checks all 6 outcome fields are present; flags banned technical vocabulary |
| `odd-ui-check` | After editing frontend files | Surfaces accessibility reminders; prompts mobile verification |
| `odd-pre-build` | Before `npm run build` or deploy | Warns on uncommitted changes before deploy; flags unreviewed outcomes |
| `odd-session-save` | After `git commit` | Saves project state to `.odd/state.json` for session continuity |

These hooks inform and protect — they don't block legitimate work. The git hooks block genuinely destructive actions (force-push onto main, committing secrets). Everything else warns and coaches.

---

## The build layer (ruflo)

When you're ready to build, ODD Studio initialises a ruflo swarm — a team of parallel specialist agents that build your outcomes concurrently:

- **Coordinator** — reads your contracts, publishes shared technical contracts before parallel building begins (solves the "two architects, one door" problem)
- **Backend agent** — implements data layer and business logic per your outcome specifications
- **UI agent** — implements the frontend using shadcn/ui, Tailwind CSS v4, and Framer Motion, against WCAG 2.1 AA accessibility standards
- **QA agent** — runs your verification steps and reports failures in your language, not technical error messages

Ruflo memory ensures continuity across Claude Code sessions — every agent knows the full project state.

---

## Default tech stack

ODD Studio configures a considered default stack that handles 90% of projects well:

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js (App Router) + TypeScript | Server-rendered, fast, well-supported |
| Styling | Tailwind CSS v4 | Consistent design without custom CSS |
| Components | shadcn/ui | Beautiful, accessible, you own the code |
| Primitives | Radix UI | Keyboard navigation and ARIA built in |
| Animation | Framer Motion | Micro-interactions without complexity |
| Database | PostgreSQL via Prisma | Reliable, type-safe, good migrations |
| Auth | NextAuth.js | Handles the complexity you don't want to |
| Payments | Stripe | The right choice for most use cases |
| Email | Resend | Modern, reliable, developer-friendly |
| Deploy | Vercel | Zero-configuration deployment |

The AI proposes the stack based on your outcomes. You approve it based on consequences, not technical details. If your outcomes require something different (offline-capable, specific hosting requirements, existing systems to integrate with), tell the AI in domain terms and it will adapt.

---

## Project structure

After `odd-studio init`, your project looks like this:

```
my-project/
├── CLAUDE.md                    ← ODD build rules for Claude Code
├── .odd/
│   └── state.json               ← Project state (updated automatically)
└── docs/
    ├── plan.md                  ← Master Implementation Plan
    ├── contract-map.md          ← Contracts and dependency graph
    ├── personas/                ← One file per user type
    │   └── example-persona.md  ← Example to learn from (then delete)
    ├── outcomes/                ← One file per workflow
    │   └── example-outcome.md  ← Example to learn from (then delete)
    └── ui/                     ← UI specifications per outcome
```

---

## Commands inside `/odd`

```
*plan          Start or resume planning (routes to the right stage)
*build         Start or resume building with ruflo swarm
*status        Show full project state
*persona       Jump to persona creation
*outcome       Jump to outcome writing
*contracts     Jump to contract mapping
*phase-plan    Jump to implementation planning
*ui            Load UI excellence layer briefing
*swarm         Initialise ruflo swarm for parallel build
*export        Generate IDE Session Brief → docs/session-brief.md
*chapter [n]   Load coaching from relevant book chapter
*why           Explain why the current step matters
*kb            Load full ODD knowledge base
*help          Show all commands
*reset         Clear state and start over (asks for confirmation)
```

---

## Other CLI commands

```bash
odd-studio status    # Show current planning state for this project
odd-studio upgrade   # Update the /odd skill and hooks to latest version
odd-studio export    # Instructions for exporting the Session Brief
```

---

## What you'll learn

By the time you've built your first system with ODD Studio, you'll understand:

- Why your users' constraints — not their preferences — determine good software design
- Why the connections between features matter more than the features themselves
- How to describe what you want precisely enough that an AI builds it correctly
- How to verify that what was built matches what you intended
- How to direct a build across multiple sessions without losing context
- How to catch problems before they become expensive to fix

These are the skills that make you effective at building with AI — permanently, not just for this project.

---

## The book

ODD Studio implements the methodology from **The ODD Way to Build Software with Agentic AI** (Book in development). Each step in the tool references the chapter that explains the underlying principle. The book and the tool are the same learning experience — you can start with either.

---

## Requirements

- Node.js 18+
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- ruflo MCP configured in Claude Code (for swarm build features)

---

## License

MIT
