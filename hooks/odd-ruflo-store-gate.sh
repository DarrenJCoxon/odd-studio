#!/usr/bin/env bash
# odd-ruflo-store-gate.sh
# ODD Studio — PostToolUse: mcp__ruflo__memory_store
#
# Fires after a successful mcp__ruflo__memory_store call.
# When key=odd-project-state is stored successfully in build phase,
# touches .odd/.ruflo-state-ready — the marker that allows git commits.
#
# This makes the chain fully automatic:
#   1. Call mcp__ruflo__memory_store key=odd-project-state
#   2. This hook fires → .ruflo-state-ready created
#   3. git commit → odd-commit-ruflo-gate.sh finds marker → commit allowed
#
# No manual file touching required. The commit gate clears the marker
# after each commit so every commit requires a fresh store.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ "$TOOL_NAME" != "mcp__ruflo__memory_store" ]; then exit 0; fi

KEY=$(echo "$INPUT" | jq -r '.tool_input.key // empty')
if [ "$KEY" != "odd-project-state" ]; then exit 0; fi

SUCCESS=$(echo "$INPUT" | jq -r '.tool_response.success // false' 2>/dev/null || echo "false")
if [ "$SUCCESS" != "true" ]; then exit 0; fi

STATE_FILE=".odd/state.json"
if [ ! -f "$STATE_FILE" ]; then exit 0; fi

CURRENT_PHASE=$(node -e "
  try {
    const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
    console.log(s.currentPhase || '');
  } catch(e) { console.log(''); }
" 2>/dev/null)

if [ "$CURRENT_PHASE" != "build" ]; then exit 0; fi

touch .odd/.ruflo-state-ready 2>/dev/null
rm -f .odd/.ruflo-state-dirty 2>/dev/null

exit 0
