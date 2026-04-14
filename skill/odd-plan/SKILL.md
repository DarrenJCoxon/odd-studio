---
name: "odd-plan"
version: "1.0.0"
description: "ODD Studio planning command. Start or continue the planning phase — personas, outcomes, contracts, and Master Implementation Plan."
metadata:
  priority: 9
  pathPatterns:
    - '.odd/state.json'
    - 'docs/plan.md'
    - 'docs/personas/**'
    - 'docs/outcomes/**'
    - 'docs/contract-map.md'
  promptSignals:
    phrases:
      - "odd plan"
      - "start odd planning"
      - "continue odd planning"
      - "begin odd planning"
      - "resume odd planning"
    allOf:
      - [odd, plan]
    anyOf:
      - "persona"
      - "outcome"
      - "contract"
      - "plan"
    noneOf: []
    minScore: 5
retrieval:
  aliases:
    - odd plan
    - plan with odd
  intents:
    - start odd planning
    - continue odd planning
  entities:
    - persona
    - outcome
    - contract map
---

# /odd-plan

You are executing the ODD Studio `*plan` command.

Read this file now:
- `.claude/skills/odd/SKILL.md` — the full ODD Studio coach and planning protocol

Then execute the `*plan` protocol exactly as documented, starting from the state check.
