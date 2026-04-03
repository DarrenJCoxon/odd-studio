#!/usr/bin/env bash
# odd-session-save.sh
# ODD Studio — Session State Save (PostToolUse: Bash)
#
# After git commit commands:
# 1. Updates local .odd/state.json with latest commit info
# 2. Refreshes the ruflo sync marker so brief/build gates do not block
# 3. Outputs a MANDATORY instruction for Claude to write state to ruflo memory
#
# Claude Code treats PostToolUse hook output as system feedback — Claude MUST act on it.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ "$TOOL_NAME" != "Bash" ]; then exit 0; fi
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only trigger on git commit
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

STATE_FILE=".odd/state.json"
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Update last-commit and timestamp in local state
LAST_COMMIT=$(git log -1 --format="%H %s" 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

node -e "
  const fs = require('fs');
  const state = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8'));
  state.lastCommit = '$LAST_COMMIT';
  state.lastSaved = '$TIMESTAMP';
  fs.writeFileSync('$STATE_FILE', JSON.stringify(state, null, 2));
" 2>/dev/null

# Refresh the ruflo sync marker so gate checks pass
touch .odd/.ruflo-phase-synced 2>/dev/null

# ── SET DIRTY MARKER ──────────────────────────────────────────────────────────
# This triggers odd-swarm-guard.sh to block EVERY subsequent turn with a loud
# 🔴 warning until Claude calls mcp__ruflo__memory_store AND runs:
#   rm -f .odd/.ruflo-state-dirty
#
# This is the nuclear gate. A PostToolUse instruction output is not enough —
# Claude can ignore text. A file on disk that the guard checks cannot be ignored.
touch .odd/.ruflo-state-dirty 2>/dev/null

exit 0
