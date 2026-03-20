# Chapter 11: Verification Is Your Job

Automated tests confirm the code does what it was told. Verification confirms it was told to do the right thing. Only you can do this. No tool can check whether an email has the right tone, whether a booking flow makes sense to a first-time user, or whether a dashboard shows what a manager actually needs.

## Key Principles

- **Automated tests confirm the code does what it was told. Verification confirms it was told to do the right thing.** Tests check that the system behaves as specified. Verification checks that the specification was correct. A perfectly tested system built from a flawed specification is a perfectly built wrong thing.

- **An outcome is verified when every step passes on a single complete run.** Not "I checked the main bits." Every step in the checklist, followed in order, as the persona, from start to finish, in one run. If you restart partway through, the run does not count.

- **Verification is done as the persona.** You are not checking as yourself — you are checking as the persona in their situation. If the persona is on a phone with limited time, verify on a phone. If the persona is a first-time user, approach the interface as if you have never seen it.

## What You Verify vs. What Checkpoint Verifies

There are two kinds of correctness in a verified outcome. You are responsible for one. Checkpoint handles the other.

**You verify domain correctness.** Does this outcome do what the persona needs it to do? Does the email contain the right information? Does the booking flow make sense to a first-time user? Does the error message explain what went wrong in plain language? Only you can answer these questions. No tool can.

**Checkpoint verifies security correctness.** Did the build introduce an exposed credential? Is there a path that bypasses authentication? Could an input be used to extract data it should not be able to reach? Checkpoint scans for these automatically every time you type `confirm`. You do not need to think about them. They are not part of your verification checklist.

This division of labour is deliberate. You are good at judging whether something is right for your users. You are not expected to know what an injection vulnerability looks like in code. Checkpoint is good at finding those. Neither replaces the other.

## Three Rules of Verification

- **Don't skip steps.** Every step in the checklist tests a specific part of the outcome. Skipping a step means that part is unverified. Unverified parts fail in production.

- **Don't approximate.** "The confirmation email probably looks fine" is not verification. Open it. Read it. Does it contain the right information? Does the link work? Check the actual result, not your assumption about it.

- **Verify the failure paths.** If the outcome includes what happens when something goes wrong — payment declined, event sold out, invalid input — verify those paths too. Failure paths are where most real-world problems hide because they are the paths least often tested.

## Red Flags

- "The build looks fine." This is not verification. It is a feeling. Follow the checklist.

- "I tested the main flow." The main flow is the happy path. What about failure paths and edge cases? If they are in the checklist, they need to be checked.

- "It worked when I tried it." Once is not a verification. Did you follow every step? As the persona? In their situation? On one complete run?

- Verification delegated to someone who does not know the domain. Verification requires domain judgment. Someone unfamiliar with your users and workflows cannot judge whether the result is correct.

## What This Means for You

Next time you reach verification, slow down. Open the checklist. Follow every step as the persona. When something is wrong, describe what you expected and what actually happened — in domain language. ODD Studio takes it from there.

Next: Chapter 12 walks through a complete single-outcome build cycle from start to finish.
