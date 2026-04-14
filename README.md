# ODD Studio

**Outcome-Driven Development for AI coding agents.**

A planning and build harness for domain experts who are building serious software with AI — and want to understand exactly what they're doing and why.

Works with **Claude Code**, **OpenCode**, and **Codex**.

---

## What this is

ODD Studio turns your AI coding agent into a guided coach that takes you through every stage of building a real software system: from understanding your users, to specifying what the system must do, to directing an AI to build it correctly, to verifying that what was built matches what you intended.

You don't need to write code. You need to understand your domain. That's the skill that matters now.

> *"The AI is the most capable junior engineer who ever lived. It can build anything you describe. It will build exactly what you describe. It will not tell you that what you described is the wrong thing to build. That judgement remains entirely yours."*

ODD Studio is the companion tool to **The ODD Way to Build Software with Agentic AI** — the book that teaches Outcome-Driven Development from first principles (book available on Amazon - https://www.amazon.co.uk/dp/B0GHT5T371). Every step in the tool references the relevant chapter. You'll understand the method as you use it, not just follow instructions.

---

## Install

### For Claude Code

Add the following into Terminal inside your project folder, NOT your system root folder.

```bash
npx odd-studio init
```

### For OpenCode (with Ollama / local models)

```bash
npx odd-studio init --agent opencode
```

### For Codex

```bash
npx odd-studio init --agent codex
```

In Codex, start ODD with a natural-language kickoff such as `use ODD`, `start ODD`, or `begin ODD`.
For a state check, use `ODD status`. To continue building, use `ODD build`. To debug without leaving the active outcome flow, use `ODD debug`.
ODD now ships Codex skill-discovery metadata so these prompts can match the plugin directly instead of relying only on `AGENTS.md`.

If this project was originally set up for Claude Code or OpenCode and you want to add Codex later, run:

```bash
npx odd-studio upgrade --agent codex
```

### For Claude Code and OpenCode on the same machine

```bash
npx odd-studio init --agent both
```

### For every supported agent on the same machine

```bash
npx odd-studio init --agent all
```

Everything is installed into your project folder. Nothing is written to your home directory or installed globally.

That single command:

- Detects your installed AI coding agent (or uses `--agent` to specify)
- Scaffolds your project structure (`docs/`, `.odd/`, instruction files)
- Installs the ODD harness into the matching project-local agent surface (`.claude/`, `.opencode/`, or `plugins/odd-studio/`)
- Configures odd-flow MCP server for cross-session memory in the matching agent config
- Optionally installs Checkpoint security scanning (you'll be asked)
- Initialises git with an initial commit

**Then open your project in your AI coding agent and start ODD:**
```
Claude Code / OpenCode: /odd
Codex: `use ODD`
```

---

## Supported agents

| Agent | How ODD integrates | Model support |
|-------|-------------------|---------------|
| **Claude Code** | Project-local skills (`.claude/skills/`), hooks (`.claude/settings.local.json`), odd-flow MCP (`.mcp.json`) | Claude (Opus, Sonnet, Haiku) |
| **OpenCode** | Project-local commands (`.opencode/commands/`), JS plugin (`.opencode/plugins/`), odd-flow MCP (`opencode.json`) | Any provider — Ollama (Qwen3-Coder, MiniMax M2.7, DeepSeek), OpenAI, Anthropic, Google, Groq, and 75+ more |
| **Codex** | Project-local plugin (`plugins/odd-studio/`), skill-discovery metadata in `SKILL.md`, local marketplace registration (`.agents/plugins/marketplace.json`), plugin MCP (`plugins/odd-studio/.mcp.json`) | Codex |

All supported agents get the same methodology, the same safety enforcement, and the same odd-flow-powered cross-session memory. The only difference is the delivery mechanism.

---

## What happens when you start ODD

Your AI coding agent loads the ODD orchestrator. It checks whether you have an existing project in progress (via your local `.odd/state.json` and odd-flow memory) and either:

- **New project:** Welcomes you, explains what you're about to build together, and starts with the first question: *Who uses this system, and what do they actually need?*
- **Returning project:** Shows you exactly where you left off and resumes from there. Nothing is lost between sessions.

From there, use the dedicated direct commands in Claude Code or OpenCode, natural-language ODD prompts in Codex, or type sub-commands inside the active ODD session once ODD is active.

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
  Direct your AI agent to build outcome by outcome, verify each one,
  and integrate them into a working system.
  Powered by: odd-flow swarm (parallel specialist agents)
```

At every step, the tool explains why the step matters — not just what to do.

---

## The safety layer

ODD Studio installs safety gates that run automatically throughout your build. The implementation differs by agent, but the enforcement is identical:

| Gate | When | What it does |
|------|------|-------------|
| Brief gate | Before agent spawning | Blocks build agents until the session brief is confirmed |
| Swarm write gate | Before file writes | Blocks writes during swarm builds unless from an assigned agent |
| Verify gate | Before state edits | Blocks premature outcome confirmation |
| Checkpoint gate | Before confirm/commit | Blocks verification and commits until a fresh security scan clears the latest build changes |
| odd-flow build gate | Before agent spawning | Blocks builds without odd-flow sync |
| odd-flow commit gate | Before git commit | Blocks commits during build without odd-flow sync |
| Outcome quality | After writing outcomes | Checks all 6 fields present; flags banned technical vocabulary |
| Persona quality | After writing personas | Checks all 7 dimensions are present |
| Code elegance | After writing source files | Checks file length against ODD limits |
| Security baseline | After writing source files | Flags hardcoded secrets, insecure auth/session patterns, and unsafe rendering/network shortcuts |
| Session save | After git commit | Auto-saves project state for session continuity |

**Claude Code:** Implemented as shell hooks registered in `.claude/settings.local.json` (project-local).
**OpenCode:** Implemented as a JS plugin (`odd-studio-plugin.js`) in `.opencode/plugins/` (project-local).
**Codex:** Implemented as a project-local plugin in `plugins/odd-studio/` with `hooks.json`, plugin-local skills, and Codex skill-discovery metadata for prompts such as `use ODD`, `ODD status`, and `ODD build`.

---

## The build layer (odd-flow)

When you're ready to build, ODD Studio initialises a odd-flow swarm — a team of parallel specialist agents that build your outcomes concurrently:

- **Coordinator** — reads your contracts, publishes shared technical contracts before parallel building begins
- **Backend agent** — implements data layer and business logic per your outcome specifications
- **UI agent** — implements the frontend using shadcn/ui, Tailwind CSS v4, and Framer Motion, against WCAG 2.1 AA accessibility standards
- **QA agent** — runs your verification steps and reports failures in your language, not technical error messages

odd-flow MCP is configured automatically in your project-local agent config — `.mcp.json` for Claude Code, `opencode.json` for OpenCode, and `plugins/odd-studio/.mcp.json` for Codex. Every agent knows the full project state, regardless of which sessions they were spawned in.

When verification fails, use `*debug` instead of leaving the ODD flow. ODD Studio records the failure, selects an explicit debug strategy, keeps the outcome active, and routes the work back into verification once the defect is fixed.

---

## Using OpenCode with local models

OpenCode connects to any Ollama-hosted model. Recommended models for ODD builds:

| Model | Active params | Context | Best for |
|-------|-------------|---------|----------|
| **Qwen3-Coder** | 3.3B | 256K | Fast local builds on consumer hardware |
| **Qwen 3.6 Plus** | MoE | 1M | Full codebase understanding, complex outcomes |
| **MiniMax M2.7** | ~10B | 204K | Self-improving agent scaffolds, strong skill adherence |
| **MiniMax M2.1** | ~10B | 1M | Long-context builds, multilingual projects |
| **GLM-5** | 32-40B | 205K | Frontier-class reasoning and coding |
| **DeepSeek V3** | MoE | 128K | Cost-effective API alternative to running local |

Install a model via Ollama and configure it in your `opencode.json`:

```bash
ollama pull qwen3-coder
```

ODD's structured methodology — narrow outcome specs, pre-defined contracts, external enforcement via the plugin — means even smaller models produce reliable builds. The methodology compensates for model limitations.

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
| Database | PostgreSQL via Drizzle | Type-safe, lightweight, agents know exact data shape |
| Testing | Vitest | Fast watch mode, automated business rule testing |
| Auth | NextAuth.js | Handles the complexity you don't want to |
| Payments | Stripe | The right choice for most use cases |
| Email | Resend | Modern, reliable, developer-friendly |
| Deploy | Vercel | Zero-configuration deployment |

The AI proposes the stack based on your outcomes. You approve it based on consequences, not technical details. If your outcomes require something different, tell the AI in domain terms and it will adapt.

---

## Project structure

After `npx odd-studio init`, your project looks like this:

```
my-project/
├── CLAUDE.md                        ← ODD build rules (Claude Code)
├── AGENTS.md                        ← ODD build rules (OpenCode and Codex)
├── .mcp.json                        ← odd-flow MCP config (Claude Code)
├── .odd/
│   └── state.json                   ← Project state (updated automatically)
├── .claude/                         ← Claude Code config (project-local)
│   ├── skills/odd/                  ← /odd skill and sub-commands
│   ├── skills/excalidraw/           ← /excalidraw wireframing skill
│   ├── hooks/odd-studio.sh          ← Safety gate script
│   └── settings.local.json          ← Hook registrations
├── .opencode/                       ← OpenCode config (project-local)
│   ├── commands/                    ← /odd command files
│   ├── plugins/odd-studio-plugin.js ← Safety gate plugin
│   └── odd/                         ← Skill knowledge base
├── .agents/plugins/marketplace.json ← Codex local marketplace registration
├── plugins/odd-studio/              ← Codex project-local plugin
│   ├── .codex-plugin/plugin.json    ← Codex plugin manifest
│   ├── commands/odd.md              ← Codex /odd command entrypoint
│   ├── skills/                      ← ODD Studio skills for Codex
│   ├── hooks/odd-studio.sh          ← Safety gate hook script
│   ├── hooks.json                   ← Codex hook registration
│   └── .mcp.json                    ← odd-flow MCP config for Codex
└── docs/
    ├── plan.md                      ← Master Implementation Plan
    ├── contract-map.md              ← Contracts and dependency graph
    ├── personas/                    ← One file per user type
    │   └── example-persona.md
    ├── outcomes/                    ← One file per workflow
    │   └── example-outcome.md
    └── ui/                          ← UI specifications per outcome
```

Only the config directories for your target agent are generated (`.claude/`, `.opencode/`, `plugins/odd-studio/`, or a supported combination).

---

## Direct Commands

These are the top-level direct commands you can invoke in Claude Code or OpenCode:

| Command | What it does |
|---------|-------------|
| `/odd` | Start or resume an ODD project — the main planning and build orchestrator |
| `/odd-plan` | Start or continue the planning phase (personas, outcomes, contracts, Master Implementation Plan) |
| `/odd-build` | Start or continue a build session — reads project state and executes the build protocol |
| `/odd-debug` | Start or continue controlled debugging inside the active outcome — chooses `ui-behaviour`, `full-stack`, `auth-security`, `integration-contract`, `background-process`, or `performance-state` before any fix |
| `/odd-status` | Show full project state, phase progress, and what comes next |
| `/odd-swarm` | Build all independent outcomes in the current phase simultaneously using odd-flow parallel agents |
| `/odd-deploy` | Verify all outcomes are confirmed, then deploy the current phase to production |
| `/odd-sync` | Sync project state to odd-flow memory (required before building) |

## Sub-commands inside `/odd`

Once ODD is active, you can use these sub-commands in Claude Code, OpenCode, or Codex:

```
*persona       Work on personas with Diana
*outcome       Write outcomes with Marcus
*contracts     Map contracts with Theo
*debug         Keep a failing build inside ODD and route it through an explicit debug strategy
*phase-plan    Jump to implementation planning with Rachel
*ui            Load UI excellence layer briefing
*agent         Create a custom agent for a domain-specific concern
*export        Generate Phase Brief → docs/session-brief-[N].md
*chapter [n]   Load coaching from relevant book chapter
*why           Explain why the current step matters
*kb            Load full ODD knowledge base
*help          Show all commands
*reset         Clear state and start over (asks for confirmation)
```

### When verification fails

Stay inside the ODD flow:

1. Describe the failure in domain language
2. Run `*debug` inside `/odd`, or use `/odd-debug` in Claude Code or OpenCode, or say `ODD debug` in Codex
3. Let ODD Studio classify the failure before fixing it:
   - `ui-behaviour`
   - `full-stack`
   - `auth-security`
   - `integration-contract`
   - `background-process`
   - `performance-state`
4. Verify again only after the fix returns the build to `verify` mode

Example:

> “The creator saves the price change, but the course page still shows the old amount.”

That should route to `full-stack`, because the defect crosses UI action, server handling, and persisted state. The harness now blocks quick fixes until the failure has been classified and the debug mode is recorded in `.odd/state.json`.

---

## CLI commands

```bash
npx odd-studio init [name]               # Scaffold a new ODD project
npx odd-studio init --agent opencode     # Scaffold for OpenCode (local models)
npx odd-studio init --agent codex        # Scaffold for Codex
npx odd-studio init --agent both         # Scaffold for both agents
npx odd-studio init --agent all          # Scaffold for Claude Code, OpenCode, and Codex
npx odd-studio init --skip-git           # Scaffold without git init or the initial commit
npx odd-studio status                    # Show current planning state (run from project dir)
npx odd-studio upgrade                   # Update skills, hooks, and odd-flow config (run from project dir)
npx odd-studio uninstall                 # Remove ODD Studio agent assets from the project
npx odd-studio export                    # Instructions for exporting the Session Brief
```

---

## Upgrading

Run from inside your existing ODD project:

```bash
npx odd-studio@latest upgrade
```

This updates skills, hooks, plugins, and odd-flow config in your project folder. No global files are modified.

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

ODD Studio implements the methodology from **The ODD Way to Build Software with Agentic AI** (https://www.amazon.co.uk/dp/B0GHT5T371). Each step in the tool references the chapter that explains the underlying principle. The book and the tool are the same learning experience — you can start with either.

---

## Requirements

- Node.js 18+
- One of:
  - **Claude Code** installed (`npm install -g @anthropic-ai/claude-code`)
  - **OpenCode** installed (`npm install -g opencode` or `brew install opencode`)
  - **Codex** installed
- odd-flow MCP is configured automatically by `npx odd-studio init`

### For local model builds (OpenCode)

- [Ollama](https://ollama.com) installed
- A capable model pulled (e.g. `ollama pull qwen3-coder`)

---

## License

MIT
