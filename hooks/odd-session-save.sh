#!/usr/bin/env bash
# odd-session-save.sh
# ODD Studio — Session State Save (PostToolUse: Bash)
#
# After git commit commands, syncs project state to ruflo memory
# so that the next /odd session can resume from exactly this point.
# Falls back to local .odd/state.json if ruflo is unavailable.

COMMAND="${CLAUDE_TOOL_INPUT:-}"

# ── Only trigger on git commit ────────────────────────────────────────────────
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

STATE_FILE=".odd/state.json"

if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# ── Update last-commit timestamp in local state ───────────────────────────────
LAST_COMMIT=$(git log -1 --format="%H %s" 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Use node to update the JSON cleanly (available since odd-studio requires node 18+)
node -e "
  const fs = require('fs');
  const state = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8'));
  state.lastCommit = '$LAST_COMMIT';
  state.lastSaved = '$TIMESTAMP';
  fs.writeFileSync('$STATE_FILE', JSON.stringify(state, null, 2));
  console.log('state updated');
" 2>/dev/null

echo "💾 ODD session state saved. Resume with /odd in Claude Code." >&2

exit 0
