#!/usr/bin/env bash
# odd-outcome-quality.sh
# ODD Studio — Outcome Quality Gate (PostToolUse: Write)
#
# Runs after a file is written. If the file is in docs/outcomes/ or docs/personas/,
# checks for completeness. Provides coaching — does not block.

FILE_PATH="${CLAUDE_TOOL_RESULT_FILE:-}"

# ── Only check ODD docs ───────────────────────────────────────────────────────
if ! echo "$FILE_PATH" | grep -qE 'docs/(outcomes|personas)/'; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

CONTENT=$(cat "$FILE_PATH")

# ── Outcome quality check ─────────────────────────────────────────────────────
if echo "$FILE_PATH" | grep -q 'docs/outcomes/'; then
  MISSING=""

  # Check for all six fields
  echo "$CONTENT" | grep -qiE 'Field 1.*Persona|## Persona' || MISSING="$MISSING\n  • Field 1 (Persona) — not found"
  echo "$CONTENT" | grep -qiE 'Field 2.*Trigger|## Trigger' || MISSING="$MISSING\n  • Field 2 (Trigger) — not found"
  echo "$CONTENT" | grep -qiE 'Field 3.*Walkthrough|## Walkthrough' || MISSING="$MISSING\n  • Field 3 (Walkthrough) — not found"
  echo "$CONTENT" | grep -qiE 'Field 4.*Verif|## Verif' || MISSING="$MISSING\n  • Field 4 (Verification) — not found"
  echo "$CONTENT" | grep -qiE 'Field 5.*Contracts|## Contracts' || MISSING="$MISSING\n  • Field 5 (Contracts Exposed) — not found"
  echo "$CONTENT" | grep -qiE 'Field 6.*Dep|## Dep' || MISSING="$MISSING\n  • Field 6 (Dependencies) — not found"

  # Check for banned vocabulary
  BANNED=$(echo "$CONTENT" | grep -iE '\b(user story|user stories|sprint|epic|backlog|api endpoint|database schema|database table|json payload|http request)\b' | head -5)

  if [ -n "$MISSING" ] || [ -n "$BANNED" ]; then
    echo "" >&2
    echo "🎯 ODD OUTCOME QUALITY CHECK: $(basename "$FILE_PATH")" >&2
    if [ -n "$MISSING" ]; then
      echo "" >&2
      echo "Incomplete outcome — missing fields:" >&2
      echo -e "$MISSING" >&2
      echo "" >&2
      echo "An outcome with missing fields will produce an incomplete build." >&2
      echo "Run *review-outcome in /odd to fix before proceeding." >&2
    fi
    if [ -n "$BANNED" ]; then
      echo "" >&2
      echo "Banned vocabulary detected:" >&2
      echo "$BANNED" | while IFS= read -r line; do echo "  → $line" >&2; done
      echo "" >&2
      echo "ODD outcomes must be written in domain language only." >&2
      echo "Translate technical terms back to what the user experiences." >&2
    fi
    echo "" >&2
  fi
fi

# ── Persona quality check ─────────────────────────────────────────────────────
if echo "$FILE_PATH" | grep -q 'docs/personas/'; then
  MISSING_DIMS=""

  echo "$CONTENT" | grep -qiE '## Identity|identity' || MISSING_DIMS="$MISSING_DIMS\n  • Identity dimension"
  echo "$CONTENT" | grep -qiE '## Current Reality|current.?reality' || MISSING_DIMS="$MISSING_DIMS\n  • Current Reality dimension"
  echo "$CONTENT" | grep -qiE '## Technical Context|technical.?context' || MISSING_DIMS="$MISSING_DIMS\n  • Technical Context dimension"
  echo "$CONTENT" | grep -qiE '## Constraints|constraints' || MISSING_DIMS="$MISSING_DIMS\n  • Constraints dimension"
  echo "$CONTENT" | grep -qiE '## Trigger Patterns|trigger.?patterns' || MISSING_DIMS="$MISSING_DIMS\n  • Trigger Patterns dimension"
  echo "$CONTENT" | grep -qiE '## Success Definition|success.?definition' || MISSING_DIMS="$MISSING_DIMS\n  • Success Definition dimension"
  echo "$CONTENT" | grep -qiE '## Failure Tolerance|failure.?tolerance' || MISSING_DIMS="$MISSING_DIMS\n  • Failure Tolerance dimension"

  if [ -n "$MISSING_DIMS" ]; then
    echo "" >&2
    echo "👤 ODD PERSONA QUALITY CHECK: $(basename "$FILE_PATH")" >&2
    echo "" >&2
    echo "Thin persona — missing dimensions:" >&2
    echo -e "$MISSING_DIMS" >&2
    echo "" >&2
    echo "A persona without all 7 dimensions produces outcomes designed for nobody in particular." >&2
    echo "Run *review-persona in /odd to complete it." >&2
    echo "" >&2
  fi
fi

exit 0
