'use strict';

export const COMMANDS = [
  {
    name: 'odd',
    description: 'Start or resume an ODD project — the main planning and build orchestrator',
    source: 'odd/SKILL.md',
    pathRewrite: { from: '~/.claude/skills/odd/', to: '.opencode/odd/' },
  },
  {
    name: 'odd-plan',
    description: 'Start or continue the planning phase — personas, outcomes, contracts, and Master Implementation Plan',
    body: 'You are executing the ODD Studio `*plan` command.\n\nRead this file now:\n- `.opencode/odd/SKILL.md` — the full ODD Studio coach and planning protocol\n\nThen execute the `*plan` protocol exactly as documented, starting from the state check.',
  },
  {
    name: 'odd-build',
    description: 'Start or continue a build session — reads project state and executes the build protocol',
    body: 'You are executing the ODD Studio `*build` command.\n\nRead these two files now:\n1. `.opencode/odd/SKILL.md` — the full ODD Studio coach and build protocol\n2. `.opencode/odd/docs/build/build-protocol.md` — the Build Protocol detail\n\nThen execute the `*build` protocol exactly as documented in those files, starting from the state check.',
  },
  {
    name: 'odd-debug',
    description: 'Start or continue an in-flow ODD debugging session — selects the correct debug approach and returns to verification',
    body: 'You are executing the ODD Studio `*debug` command.\n\nRead these two files now:\n1. `.opencode/odd/SKILL.md` — the full ODD Studio coach and build protocol\n2. `.opencode/odd/docs/build/debug-protocol.md` — the Debug Protocol detail\n\nBefore you inspect code or propose a fix, classify the failure into exactly one strategy:\n- `ui-behaviour` for visible interface-only failures\n- `full-stack` for browser-to-route-to-service-to-data failures\n- `auth-security` for auth, permissions, trust boundaries, uploads, or webhooks\n- `integration-contract` for producer-consumer or contract mismatches\n- `background-process` for jobs, queues, webhooks, or async delivery\n- `performance-state` for stale data, races, caching, or timing-sensitive defects\n\nIf the evidence is mixed, gather more evidence first and then choose the narrowest matching strategy. Do not guess. Do not apply a quick fix. Then execute the `*debug` protocol exactly as documented in those files, starting from the state check and recording the chosen strategy in `.odd/state.json` before any fix is attempted.',
  },
  {
    name: 'odd-swarm',
    description: 'Build all independent outcomes in the current phase simultaneously using odd-flow parallel agents',
    body: 'You are executing the ODD Studio `*swarm` command.\n\nRead these two files now:\n1. `.opencode/odd/SKILL.md` — the full ODD Studio coach and build protocol\n2. `.opencode/odd/docs/build/build-protocol.md` — the Build Protocol detail\n\nThen execute the `*swarm` protocol exactly as documented in those files, starting from the state check.',
  },
  {
    name: 'odd-status',
    description: 'Show full project state, phase progress, and what comes next',
    body: 'You are executing the ODD Studio `*status` command.\n\nRead this file now:\n- `.opencode/odd/SKILL.md` — the full ODD Studio coach\n\nThen execute the `*status` protocol exactly as documented, starting from the state check.',
  },
  {
    name: 'odd-deploy',
    description: 'Verify all outcomes are confirmed, then deploy the current phase to production',
    body: 'You are executing the ODD Studio `*deploy` command.\n\nRead this file now:\n- `.opencode/odd/SKILL.md` — the full ODD Studio coach\n\nThen execute the `*deploy` protocol exactly as documented, starting from the state check.',
  },
  {
    name: 'odd-sync',
    description: 'Sync ODD project state to odd-flow memory. MUST be run before building.',
    body: `You are syncing ODD project state to odd-flow memory. Follow these steps exactly:

## Step 1 — Read project state

Read \`.odd/state.json\` and store the full contents in a variable.

## Step 2 — Store state in odd-flow

Call \`mcp__odd-flow__memory_store\` with:
- **key**: \`odd-project-state\`
- **namespace**: \`odd-project\`
- **value**: the full contents of \`.odd/state.json\`

## Step 3 — Read and store the current session brief

Read \`sessionBriefCount\` from state.json. If it is greater than 0, read the file \`docs/session-brief-[N].md\` where N equals the sessionBriefCount value.

If the brief file exists, call \`mcp__odd-flow__memory_store\` with:
- **key**: \`odd-session-brief-[N]\` (replace [N] with the actual number)
- **namespace**: \`odd-project\`
- **value**: the full contents of the session brief file

## Step 4 — Create marker files

Run via shell:
\`\`\`bash
touch .odd/.odd-flow-phase-synced
\`\`\`

If a session brief was stored in Step 3, also run:
\`\`\`bash
touch .odd/.odd-flow-brief-stored
\`\`\`

## Step 5 — Confirm

Report to the user:

> odd-flow synced. Phase [X] state and brief [N] stored. Build agents unlocked.

Replace [X] with \`currentBuildPhase\` from state.json and [N] with the session brief number.`,
  },
];
