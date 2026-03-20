# ODD Studio — Build Protocol

The Build Protocol is the discipline that turns a well-written ODD plan into working software. ODD Studio handles all the mechanics — context, contracts, phase tracking, re-briefing, committing. The domain expert does one thing: verify that what was built is right for real users, and describe failures in plain language.

---

## The Session Rhythm

Every build session follows the same three steps. The tool manages continuity between sessions through ruflo memory. The domain expert never re-briefs the AI, tracks state manually, or writes handover notes.

---

### Step 1 — Open the project

Type `/odd`.

ODD Studio reads the full project state from ruflo memory — personas, outcomes, contracts, phase order, verification status. It reports exactly where the build stands and what comes next. If the last session ended three days ago or three weeks ago, the state is the same. The domain expert does not need to remember anything.

---

### Step 2 — Build

For a single outcome: type `*build`.

For multiple independent outcomes in the current phase: type `*swarm`.

ODD Studio briefs the build AI with the full six-field specification, the relevant contracts, and the context from previous outcomes. The domain expert waits. The build takes minutes.

The domain expert does not re-brief the AI, paste context, identify shared infrastructure, or check dependencies. ODD Studio handles all of that from ruflo memory.

---

### Step 3 — Verify

When ODD Studio reports the build is complete, the verification checklist is on screen.

Follow each step in order. Follow them as the persona — not as yourself reviewing a system, but as the specific person in the specific situation the outcome was written for.

**Record each step: pass / fail / missing.**

**Verify the failure paths.** These are not optional. They are where the AI made assumptions — what to show when the event is full, what to do when payment fails, what happens when the session expires. The happy path is what the AI builds most reliably. The failure paths are where assumptions accumulate.

**An outcome is verified when every step passes on a single complete run** — not when each step has passed at some point across multiple attempts.

---

### Describing failures

When a step fails, describe it in domain language — what the person sees, what should happen instead. Not technical causes. Not error codes.

**Good descriptions:**
- "The confirmation email arrives but there is no calendar invitation. I cannot add the event to my calendar from the email."
- "When I try to book an event that already has no remaining places, the booking goes through without any warning."
- "After I cancel my booking, my account still shows it as upcoming. It only disappears when I refresh the page."

Collect all failures from the verification run and send them in a single message. ODD Studio re-briefs the AI with the failures and triggers a fix. After the fix, re-verify from step one — all steps, not just the ones that failed.

---

### Confirming

When all steps pass on a single complete run, type `confirm`.

ODD Studio runs Checkpoint — a security scan of everything built in this outcome. The domain expert does not trigger this, read the results, or action any findings. It happens automatically.

If Checkpoint finds no issues, ODD Studio commits the verified state, updates ruflo memory, and presents the next outcome.

If Checkpoint finds security issues, ODD Studio briefs the build agent with the findings and triggers a fix. The domain expert waits. Once the fix is complete, Checkpoint runs again. When it is clear, the outcome is committed and the next outcome is presented.

The domain expert did not write a commit message, update a status file, identify security issues, or decide what comes next. The tool handled all of that.

---

## Integration Protocol

After all outcomes in a phase are individually verified, ODD Studio runs the Integration Protocol automatically. The domain expert does not initiate this — the post-phase hook triggers it when the last outcome in the phase is confirmed.

Three checks run:

**Handshake check.** For each pair of outcomes that share a contract, confirm the data passing between them is correct in domain terms. Does the organiser's view show the correct customer details from the booking? Does the refund outcome have access to the payment details the booking outcome recorded?

**Data flow trace.** Follow one entity — a customer, a booking, an event — through every outcome in the phase. Confirm the data is consistent. The customer's name should be the same everywhere. The booking reference should appear wherever it should appear.

**Cross-persona check.** Confirm each persona sees what they should see and cannot access what they should not. Navigate as a customer to a page that should only be accessible to an organiser. Confirm it is blocked.

When all three checks pass, the phase is complete. ODD Studio marks it so, updates ruflo memory, and confirms which phase is next.

---

## Handling failures

### Verification failure

A step fails. Describe what you see and what should happen instead. One message for all failures. ODD Studio routes the fix to the AI and triggers re-verification.

### Specification gap

Verification reveals not a specific failure but a wrong assumption about what the outcome should do — a case that was never specified, a requirement that was invisible until the system was working.

This is not a verification failure. It is a specification gap. Type `*outcome` to open the relevant outcome and update the field that was wrong. ODD Studio saves the updated specification to ruflo memory and re-briefs the AI with the corrected version. Then rebuild and re-verify.

### When something is consistently wrong

If the same outcome fails verification repeatedly, the most likely cause is a specification problem — a walkthrough that left a case ambiguous, a verification step that cannot actually be passed as written. Return to `*outcome`, update the specification, and rebuild from the corrected version.

---

## Red flags

**"The build looks fine."** Fine is not verified. Fine means a visual scan was performed. An outcome that looks fine has not had its failure paths tested.

**"I tested the main flow."** The happy path was checked. The failure paths — where the AI made assumptions — were not.

**Describing failures in technical language.** "The API returns a 500 error" is a technical description. "When I try to book, the page shows a generic error message instead of telling me the event is full" is a domain description. Use the second.

**Skipping verification steps.** A step skipped because it seems fine is a step that has not been verified. The outcome is verified when all steps pass on the same complete run.
