# Chapter 10: The Build Protocol

ODD Studio handles all mechanics — context loading, contract validation, re-briefing, committing. You do three things: type /odd, type *build, verify the result. The tool handles the rest.

The Build Protocol is the repeating rhythm of every session. It is deliberately simple because the complexity belongs in the specification, not in the process. If the specification is precise, the build protocol is almost mechanical. If the build goes wrong, the cause is almost always in the specification, not in the process.

## Key Principles

- **The tool handles the mechanics. You handle the judgment.** ODD Studio loads context from ruflo, reads the contract map, identifies the next outcome to build, briefs the AI, waits for the result, and presents you with a verification checklist. Your job is to follow that checklist as the persona and judge whether the result is correct.

- **The session rhythm is: /odd, *build, verify, confirm.** `/odd` loads the skill and restores project state from ruflo. `*build` starts the next outcome. You verify the result against the checklist. `confirm` runs Checkpoint (a security scan of what was just built), commits the verified outcome, and advances to the next one. That is it.

- **Re-briefing is automatic.** You do not need to remind the AI what your project is, what has been built, or what comes next. Ruflo stores all of this. ODD Studio reads it at the start of every session. If you find yourself explaining context, something is wrong with the state — not with the process.

- **One outcome per build cycle.** Each *build targets one outcome. Build it, verify it, confirm it, move on. Trying to build multiple outcomes in one cycle defeats the purpose of outcome-level verification.

## Red Flags

- Re-briefing the AI manually. If you are pasting specifications, explaining context, or reminding the AI about previous decisions, the state management is not working. Check ruflo. Check CLAUDE.md.

- Tracking state in a separate document. Notes, spreadsheets, or documents that track what has been built and what comes next are a sign that you are not trusting the tool to manage state. The tool does this. Let it.

- Building without verifying. Typing `confirm` without following the verification checklist is the fastest way to accumulate hidden defects. Every unverified outcome is a risk to every outcome that depends on it.

- Worrying about security implementation. Checkpoint runs automatically when you type `confirm`. It scans for exposed secrets, missing authentication checks, and injection vulnerabilities in what was just built. If it finds something, the build agent fixes it before the commit. You do not need to think about this — it happens in the background.

- Batching multiple outcomes into one build. Each outcome has its own verification checklist for a reason. Mixing them makes it impossible to know which outcome caused a failure.

## What This Means for You

Your next session: type `/odd`. Read what ODD Studio tells you about where you are. Type `*build`. Follow the checklist. If it passes, type `confirm`. If it fails, describe the failure in your own words — not in technical terms. ODD Studio handles the fix.

Next: Chapter 11 explains why verification is your job and no tool can replace your judgment.
