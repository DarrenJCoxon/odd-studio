---
name: "odd-status"
version: "1.0.0"
description: "ODD Studio status command. Show full project state, phase progress, and what comes next."
metadata:
  priority: 9
  pathPatterns:
    - '.odd/state.json'
    - 'docs/plan.md'
    - 'docs/session-brief*.md'
  promptSignals:
    phrases:
      - "odd status"
      - "show odd status"
      - "resume odd status"
      - "where are we in odd"
      - "what is the odd status"
    allOf:
      - [odd, status]
    anyOf:
      - "status"
      - "progress"
      - "phase"
      - "resume"
    noneOf: []
    minScore: 5
retrieval:
  aliases:
    - odd status
    - odd progress
  intents:
    - show odd status
    - inspect odd progress
  entities:
    - current phase
    - next step
---

# /odd-status

You are executing the ODD Studio `*status` command.

Read this file now:
- `.claude/skills/odd/SKILL.md` — the full ODD Studio coach

Then execute the `*status` protocol exactly as documented, starting from the state check.
