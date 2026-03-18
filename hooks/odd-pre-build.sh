#!/usr/bin/env bash
# odd-pre-build.sh
# ODD Studio — Pre-Build Safety Check (PreToolUse: Bash)
#
# Runs before npm run build, npm test, and deployment commands.
# Checks that ODD project state is sane before the build proceeds.

COMMAND="${CLAUDE_TOOL_INPUT:-}"

# ── Only intercept build/deploy commands ─────────────────────────────────────
if ! echo "$COMMAND" | grep -qE '(npm\s+run\s+(build|deploy|start:prod)|yarn\s+(build|deploy)|pnpm\s+(build|deploy))'; then
  exit 0
fi

# ── Check git is clean before production builds ───────────────────────────────
if echo "$COMMAND" | grep -qiE '(deploy|start:prod)'; then
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "🏗️ ODD PRE-BUILD: Uncommitted changes before deploy." >&2
    echo "" >&2
    echo "You have uncommitted changes. ODD Studio recommends:" >&2
    echo "  1. Review changes: git diff" >&2
    echo "  2. Commit: git add -A && git commit -m 'describe what changed'" >&2
    echo "  3. Then deploy" >&2
    echo "" >&2
    echo "Deploying from a dirty working tree makes it hard to roll back." >&2
    exit 2
  fi
fi

# ── Check ODD plan exists before first build ─────────────────────────────────
if [ ! -f "docs/plan.md" ]; then
  echo "🏗️ ODD PRE-BUILD: No Master Implementation Plan found." >&2
  echo "" >&2
  echo "docs/plan.md does not exist in this project." >&2
  echo "ODD Studio recommends completing planning before building:" >&2
  echo "  Open Claude Code → /odd → *plan" >&2
  echo "" >&2
  echo "Building without a plan means building the wrong thing." >&2
  # Warning only for missing plan — don't block a legitimate build
fi

# ── Check for any unverified outcomes before building next phase ──────────────
if [ -d "docs/outcomes" ]; then
  UNVERIFIED=$(grep -rl "status.*draft\|Review Status.*DRAFT" docs/outcomes/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UNVERIFIED" -gt 0 ]; then
    echo "🏗️ ODD PRE-BUILD: $UNVERIFIED unverified outcome(s) detected." >&2
    echo "" >&2
    echo "Some outcomes are in DRAFT status and have not been reviewed." >&2
    echo "Building from unreviewed outcomes produces systems that do not match your intentions." >&2
    echo "" >&2
    echo "Run *review-outcome in /odd for each draft outcome before building." >&2
    echo "" >&2
    # Warning only — does not block the build
  fi
fi

exit 0
