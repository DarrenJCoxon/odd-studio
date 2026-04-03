#!/usr/bin/env bash
# odd-commit-ruflo-gate.sh
# ODD Studio — PreToolUse: Bash
#
# Blocks ANY git commit tool call in build phase unless ruflo state
# has been stored first. Exit 2 rejects the tool call entirely —
# Claude sees it as a failed tool call, not a warning.
#
# The .ruflo-state-ready marker is set automatically by
# odd-ruflo-store-gate.sh after a successful mcp__ruflo__memory_store.
#
# Flow:
#   mcp__ruflo__memory_store → .ruflo-state-ready created
#   git commit → this gate checks → marker found → commit allowed → marker removed
#   git commit (no store) → this gate checks → no marker → EXIT 2 (blocked)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ "$TOOL_NAME" != "Bash" ]; then exit 0; fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then exit 0; fi

STATE_FILE=".odd/state.json"
if [ ! -f "$STATE_FILE" ]; then exit 0; fi

CURRENT_PHASE=$(node -e "
  try {
    const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
    console.log(s.currentPhase || '');
  } catch(e) { console.log(''); }
" 2>/dev/null)

if [ "$CURRENT_PHASE" != "build" ]; then exit 0; fi

READY_MARKER=".odd/.ruflo-state-ready"

if [ ! -f "$READY_MARKER" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔴  COMMIT BLOCKED — ruflo state not stored"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  You cannot commit until ruflo state is stored."
  echo "  This is a hard block — not a warning."
  echo ""
  echo "  DO THIS FIRST:"
  echo ""
  echo "  mcp__ruflo__memory_store"
  echo "    key=odd-project-state"
  echo "    namespace=odd-project"
  echo "    upsert=true"
  echo "    value=<full .odd/state.json contents>"
  echo ""
  echo "  The commit will go through automatically after this."
  echo "  There are no exceptions. There is no workaround."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 2
fi

# Marker consumed — next commit requires a fresh store
rm -f "$READY_MARKER"
exit 0
