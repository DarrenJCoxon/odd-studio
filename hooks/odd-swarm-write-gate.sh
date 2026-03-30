#!/usr/bin/env bash
# odd-swarm-write-gate.sh
# ODD Studio — Swarm Write Gate (PreToolUse: Write, Edit)
#
# BLOCKS direct file writes to source code during the build phase
# unless the ruflo swarm has been initialised. This prevents protocol
# drift where the LLM bypasses swarm coordination and edits files directly.
#
# The swarm must be initialised (marker file exists) before ANY source
# code changes can be made during a build phase.
#
# Exit 0  → allow the write
# Exit 2  → block the write
#
# ALLOWED without swarm:
# - Writes to .odd/ (state management)
# - Writes to docs/ (planning, briefs)
# - Writes to memory/ (auto-memory)
# - Writes outside build phase
# - Non-ODD projects

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only intercept Write and Edit
if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ]; then
  exit 0
fi

STATE_FILE=".odd/state.json"

# No ODD project — not our concern
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

CURRENT_PHASE=$(node -e "
  const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
  console.log(s.currentPhase || '');
" 2>/dev/null)

# Only enforce during build phase
if [ "$CURRENT_PHASE" != "build" ]; then
  exit 0
fi

# Get the file path being written
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Allow writes to non-source locations (state, docs, memory, config markers)
if echo "$FILE_PATH" | grep -qE '(\.odd/|docs/|memory/|MEMORY\.md|CLAUDE\.md|\.ruflo)'; then
  exit 0
fi

# Allow writes to hook files and skill files (meta-development)
if echo "$FILE_PATH" | grep -qE '(hooks/|skill/|scripts/)'; then
  exit 0
fi

# Check if swarm is initialised
SWARM_MARKER=".odd/.ruflo-swarm-active"

if [ ! -f "$SWARM_MARKER" ]; then
  echo "🚫 ODD SWARM WRITE GATE: Direct file writes blocked during build phase." >&2
  echo "" >&2
  echo "The ruflo swarm has not been initialised. During the ODD build protocol," >&2
  echo "all source code changes must go through swarm-coordinated agents." >&2
  echo "" >&2
  echo "To proceed:" >&2
  echo "  1. Initialise the swarm: call mcp__ruflo__swarm_init" >&2
  echo "  2. Spawn agents per the build protocol (coordinator, backend, UI, QA)" >&2
  echo "  3. Agents will make the file changes — not direct Write/Edit calls" >&2
  echo "" >&2
  echo "If you need to bypass this gate (e.g., for a quick hotfix outside the build" >&2
  echo "protocol), create the marker: touch .odd/.ruflo-swarm-active" >&2
  echo "" >&2
  echo "File blocked: $FILE_PATH" >&2
  exit 2
fi

# Check marker age — must be less than 3600 seconds (1 hour)
MARKER_AGE=$(( $(date +%s) - $(stat -f %m "$SWARM_MARKER" 2>/dev/null || stat -c %Y "$SWARM_MARKER" 2>/dev/null || echo 0) ))
if [ "$MARKER_AGE" -gt 3600 ]; then
  echo "🚫 ODD SWARM WRITE GATE: Swarm marker expired (>1 hour old)." >&2
  echo "" >&2
  echo "Re-initialise the swarm or touch .odd/.ruflo-swarm-active to refresh." >&2
  echo "" >&2
  echo "File blocked: $FILE_PATH" >&2
  exit 2
fi

exit 0
