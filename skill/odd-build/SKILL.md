---
name: "odd-build"
version: "1.0.0"
description: "ODD Studio build command. Reads project state from odd-flow memory and executes the *build protocol from the ODD Studio coach. Use /odd-build to start or continue a build session."
metadata:
  priority: 9
  pathPatterns:
    - '.odd/state.json'
    - 'docs/plan.md'
    - 'docs/outcomes/**'
    - 'docs/session-brief*.md'
  promptSignals:
    phrases:
      - "odd build"
      - "start odd build"
      - "continue odd build"
      - "begin odd build"
      - "resume odd build"
    allOf:
      - [odd, build]
    anyOf:
      - "build"
      - "phase"
      - "verification"
      - "outcome"
    noneOf: []
    minScore: 5
retrieval:
  aliases:
    - odd build
    - build with odd
  intents:
    - start odd build
    - continue odd build
  entities:
    - current build phase
    - phase brief
---

# /odd-build

You are executing the ODD Studio `*build` command.

Read these two files now:
1. `.claude/skills/odd/SKILL.md` — the full ODD Studio coach and build protocol
2. `.claude/skills/odd/docs/build/build-protocol.md` — the Build Protocol detail

Then execute the `*build` protocol exactly as documented in those files, starting from the state check.
