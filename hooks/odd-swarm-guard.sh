#!/usr/bin/env bash
# odd-swarm-guard.sh
# ODD Studio — Swarm Init Guard (UserPromptSubmit)
#
# Fires before EVERY response when the project is in build phase.
# If the ruflo swarm has not been initialised, injects a loud blocking
# reminder as system context — visible to Claude before any tool call.
#
# This is the nuclear gate. It fires BEFORE Claude reads files, plans,
# or does anything. The existing Write/Edit gates only fire at execution.
# This gate fires at the start of every turn.
#
# Exit 0 + stdout → injects warning into conversation context
# Exit 2           → blocks the user message entirely (not used here)

STATE_FILE=".odd/state.json"
SWARM_MARKER=".odd/.ruflo-swarm-active"
DIRTY_MARKER=".odd/.ruflo-state-dirty"

# Not an ODD project — pass through
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

CURRENT_PHASE=$(node -e "
  try {
    const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
    console.log(s.currentPhase || '');
  } catch(e) { console.log(''); }
" 2>/dev/null)

# Only enforce during build phase
if [ "$CURRENT_PHASE" != "build" ]; then
  exit 0
fi

# ── GATE 1: ruflo state dirty (commit happened without ruflo store) ───────────
if [ -f "$DIRTY_MARKER" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔴  ODD STUDIO — RUFLO STATE NOT SAVED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  A git commit was made but .odd/state.json was NOT stored to ruflo."
  echo "  This MUST be fixed before ANY other action."
  echo ""
  echo "  DO THIS NOW — two steps, in order:"
  echo ""
  echo "  1. mcp__ruflo__memory_store"
  echo "       key=odd-project-state"
  echo "       namespace=odd-project"
  echo "       upsert=true"
  echo "       value=<full contents of .odd/state.json>"
  echo ""
  echo "  2. Bash: rm -f .odd/.ruflo-state-dirty"
  echo ""
  echo "  This message fires on EVERY turn until both steps are complete."
  echo "  There are no exceptions. There is no workaround."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 0
fi

# ── GATE 2: ruflo swarm not initialised ──────────────────────────────────────
if [ -f "$SWARM_MARKER" ]; then
  # Check marker isn't stale (>1 hour)
  MARKER_AGE=$(( $(date +%s) - $(stat -f %m "$SWARM_MARKER" 2>/dev/null || stat -c %Y "$SWARM_MARKER" 2>/dev/null || echo 0) ))
  if [ "$MARKER_AGE" -le 3600 ]; then
    exit 0
  fi
  # Stale marker — fall through to warning
  STALE=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚫  ODD STUDIO — RUFLO SWARM NOT INITIALISED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "${STALE:-0}" = "1" ]; then
  echo ""
  echo "  The swarm marker exists but is more than 1 hour old. Re-init required."
fi
echo ""
echo "  You are in ODD build phase. The ruflo swarm MUST be initialised"
echo "  before ANY other action — before reading files, before planning,"
echo "  before writing code, before anything."
echo ""
echo "  REQUIRED STEPS (do these NOW, in this order):"
echo ""
echo "  1. mcp__ruflo__memory_store  key=odd-project-state  (store .odd/state.json)"
echo "  2. mcp__ruflo__memory_store  key=odd-contract-map   (store docs/contract-map.md)"
echo "  3. mcp__ruflo__task_create   name='Phase [X] Build' (phase task)"
echo "  4. mcp__ruflo__agent_spawn   role=coordinator"
echo "  5. mcp__ruflo__agent_spawn   role=backend"
echo "  6. mcp__ruflo__agent_spawn   role=frontend"
echo "  7. mcp__ruflo__agent_spawn   role=qa"
echo "  8. Bash: touch .odd/.ruflo-swarm-active"
echo "  9. mcp__ruflo__coordination_sync"
echo ""
echo "  This message disappears once .odd/.ruflo-swarm-active exists."
echo "  Do NOT skip these steps. Do NOT read source files first."
echo "  The SKILL.md *build protocol step 7 is swarm init — do it NOW."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
