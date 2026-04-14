# ODD Studio Audit Report

Date: 2026-04-06
Package: `odd-studio`
Audited path: `/Users/darrencoxon/Documents/Codebases/current-projects/odd-studio`

## Executive Summary

`odd-studio` is a production CLI package that scaffolds and governs Outcome-Driven Development projects for AI coding agents. It creates project-local configuration, installs local skills or commands, configures enforcement hooks or plugins, sets up odd-flow MCP state continuity, and manages upgrade and uninstall flows.

This audit focused on:

- functionality
- code quality
- test coverage and rigor
- hardening and destructive behavior
- security posture
- outside-directory reach
- external dependencies and install behavior

The repo is in substantially better shape after remediation and refactoring. The previously identified high-risk issues around path filtering, uninstall breadth, hidden mutable runtime resolution, and weak lifecycle coverage have been addressed. The large structural maintainability issues have also been improved through CLI and plugin modularization. The remaining concerns are now mostly long-term drift risk and a few still-large modules rather than immediate release blockers.

## Scope

Reviewed areas included:

- CLI entrypoint: `bin/odd-studio.js`
- setup scripts in `scripts/`
- Claude enforcement hooks in `hooks/`
- OpenCode plugin in `plugins/`
- templates in `templates/`
- shipped skill content in `skill/`
- test suite in `tests/`
- package manifest and lockfile
- user-facing documentation in `README.md`

## What The Package Does

`odd-studio` is a tooling package, not an application runtime.

Its primary responsibilities are:

- scaffold a new ODD project
- detect the target coding agent
- install project-local Claude skills
- install project-local OpenCode commands and plugin assets
- register Claude safety hooks
- configure project-local odd-flow MCP connectivity
- optionally install additional security tooling
- initialize git unless explicitly skipped
- upgrade local ODD assets in an existing project
- uninstall ODD-owned assets from an existing project

## Purpose

The package exists to make AI-assisted software delivery more structured and less ad hoc. It does this by enforcing a planning-first and verification-first workflow, preserving state across sessions, and adding policy checks around build sequencing, verification, and destructive workflow mistakes.

The product purpose is coherent and clearly implemented.

## Functionality Assessment

Overall functionality status: Good

The package appears functionally complete for its intended role.

Working behavior observed and/or verified:

- project scaffolding
- project-local state creation
- Claude Code installation flow
- OpenCode installation flow
- project-local odd-flow config generation
- hook and plugin installation
- status command behavior
- upgrade flow
- uninstall flow
- skip-git flow

The package also now reflects its runtime odd-flow policy explicitly by configuring `odd-flow@latest` rather than relying on ambiguous mutable resolution.

## Code Quality Assessment

Overall code quality status: Good

Strengths:

- small direct dependency footprint
- mostly understandable setup scripts
- idempotent config-writing behavior in key areas
- backup behavior before modifying some existing config files
- clearer separation between scaffold, hooks, MCP, and install tasks

Remaining weaknesses:

- Claude shell-hook enforcement still exists separately from the JS plugin implementation
- some command modules are still heavier than ideal, especially `bin/commands/init.js`
- the shell hook remains a large policy surface

Current file-shape highlights after refactor:

- `bin/odd-studio.js`: 34 lines
- `plugins/odd-studio-plugin.js`: 39 lines
- `bin/commands/init.js`: 213 lines
- `hooks/odd-studio.sh`: 505 lines

This is a major improvement over the pre-refactor shape and materially reduces maintenance risk on the JS side.

## Test Suite Assessment

Overall test status: Good

Full verification at audit time:

- `npm test`
- Result: 9 test files, 112 tests, all passing

What is now covered:

- scaffolding validation
- setup-hook behavior
- MCP config behavior
- hook interpolation safety
- state schema expectations
- plugin path classification behavior
- plugin commit metadata behavior
- CLI `init`
- CLI `status`
- CLI `upgrade`
- CLI `uninstall`
- preservation of unrelated Claude and OpenCode assets during uninstall

Assessment of rigor:

- stronger than the original audit state
- includes behavior-level tests for key lifecycle flows
- includes modular plugin structure checks and direct behavior checks
- still not full end-to-end environment testing inside a real agent host
- still not browser-style workflow verification, which is acceptable for a CLI package

Note: the raw test count is lower than an earlier intermediate state because brittle source-string assertions were replaced with more focused structural and behavior-led checks.

Test rigor rating: Moderate to Good

## Security Posture

Overall security posture: Moderate to Good

Positive findings:

- no obvious hidden exfiltration behavior
- no hardcoded secrets observed
- project name validation exists
- most writes are scoped to the target project
- destructive uninstall behavior has been narrowed
- hook security tests explicitly check safe env passing into inline Node execution

Known trust surfaces:

- `git` commands during scaffolding
- optional `npx @darrenjcoxon/vibeguard --install-tools`
- configured runtime execution of `npx -y odd-flow@latest mcp start`

These are not hidden behaviors. They are product behaviors and should be treated as part of the trust contract.

## Outside-Directory Reach

The package does not appear to directly write outside the target project during standard setup and lifecycle operations.

It does, however, reach outside the directory in limited ways:

- reads home-directory locations for agent detection
- relies on `npx`, which may use npm-managed cache locations
- uses `git`, which may interact with user git config

This is reasonable for a developer tool and does not currently appear deceptive.

## Dependencies And Installs

Direct package dependencies:

- `chalk`
- `commander`
- `fs-extra`
- `inquirer`
- `ora`

Development dependency:

- `vitest`

Install-time behavior:

- package `postinstall` is informational only
- project setup work happens through `odd-studio init`
- optional git init can now be skipped
- optional external security tool installation remains explicit and opt-in

## Remediation And Refactor Completed

The following previously identified issues have been addressed:

1. OpenCode source-path classification was corrected and behavior-tested.
2. Runtime odd-flow resolution was made explicit via `odd-flow@latest`.
3. OpenCode uninstall now removes only ODD-owned files rather than entire shared directories.
4. Claude hook and OpenCode plugin now write matching commit metadata fields.
5. Brief-file messaging was aligned to `docs/session-brief-[N].md`.
6. CLI lifecycle coverage was expanded to include `init`, `status`, `upgrade`, and `uninstall`.
7. Claude-side uninstall preservation behavior is now covered by tests.
8. CLI command handling has been modularized behind a thin entrypoint.
9. Shared asset and command definitions are now centralized.
10. The OpenCode plugin has been decomposed into focused modules for markers, paths, quality checks, and gate wiring.

## Residual Risks

These are the remaining non-blocking concerns:

### 1. Dual enforcement implementations

Claude and OpenCode policy logic still live in separate shell and JS implementations.

Impact:

- future drift risk
- repeated maintenance effort

Severity: Medium

### 2. Large remaining hook surface

The shell hook remains a large and important policy file.

Impact:

- harder review and maintenance on the Claude path
- greater chance of parity drift over time

Severity: Medium

### 3. Mutable odd-flow runtime target by design

The package now explicitly uses `odd-flow@latest`, which matches the intended ownership model, but this remains a deliberate reproducibility tradeoff.

Impact:

- faster rollout of odd-flow changes
- lower reproducibility for older installs

Severity: Low

## Questionable Functionality Review

No malicious or covertly suspicious functionality was found.

Behavior that may merit clear user communication:

- automatic git initialization unless `--skip-git` is used
- optional third-party tool installation via `npx`
- enforcement hooks and plugins that can block writes or commits under defined conditions

These are legitimate package features, not hidden behaviors.

## Overall Verdict

Release confidence: Good

Current assessment:

- Functionality: Strong
- Code quality: Good
- Test rigor: Moderate to Good
- Hardening: Moderate to Good
- Security posture: Moderate to Good

Final verdict:

`odd-studio` is suitable for continued production use. The major audit risks identified in the earlier review have been remediated, and the post-audit refactor materially improved maintainability. The remaining issues are primarily long-term policy-drift concerns rather than immediate operational blockers.

## Recommended Next Steps

Recommended future improvements:

1. Consider generating shell and JS enforcement behavior from a shared policy definition.
2. Reduce the size and responsibility of `hooks/odd-studio.sh`.
3. Split `bin/commands/init.js` further if new setup logic continues to accumulate.
4. Add one or two higher-fidelity smoke tests in a closer-to-real agent environment.
5. Keep user-facing docs aligned whenever runtime policy changes.
