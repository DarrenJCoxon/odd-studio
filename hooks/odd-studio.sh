#!/usr/bin/env bash
# odd-studio.sh — unified enforcement layer for ODD Studio
#
# Single hook script that handles all ODD Studio gates.
# Called with a gate name as the first argument:
#   odd-studio.sh <gate-name>
#
# Gates:
#   PreToolUse (exit 2 = block):
#     brief-gate       Agent    — blocks agent spawn without confirmed brief
#     build-gate       Agent    — blocks agent spawn without full swarm init
#     swarm-write      Write|Edit — blocks source writes without swarm + agent token
#     verify-gate      Edit|Write — blocks marking outcomes verified without checklist
#     confirm-gate     Edit|Write — blocks briefConfirmed without odd-flow store
#     checkpoint-gate  Bash     — blocks commits until a fresh Checkpoint scan clears the latest source changes
#     commit-gate      Bash     — blocks git commit without odd-flow state stored
#
#   PostToolUse (exit 0 + stderr = coaching):
#     session-save     Bash     — auto-save state after git commit
#     store-validate   mcp__odd-flow__memory_store — creates ready marker
#     sync-validate    mcp__odd-flow__coordination_sync — creates agents-ready marker
#     code-quality     Write|Edit — code elegance check
#     security-quality Write|Edit — security baseline check + checkpoint dirty marker
#     checkpoint-validate Bash    — marks checkpoint clear after a successful scan
#     brief-quality    Write    — session brief quality check
#     outcome-quality  Write    — outcome/persona quality check
#
#   UserPromptSubmit (exit 0 + stdout = inject context):
#     swarm-guard      (none)   — warns every turn if build phase without swarm

set -euo pipefail

GATE="${1:-}"
STATE_FILE=".odd/state.json"
INPUT=$(cat)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Shared helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Not an ODD project — pass through silently
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Require jq for JSON parsing — fail clearly if missing
if ! command -v jq >/dev/null 2>&1; then
  echo "ODD STUDIO: jq is required but not installed." >&2
  echo "Install with: brew install jq (macOS) or apt install jq (Linux)" >&2
  exit 0
fi

get_state_field() {
  ODD_STATE_FILE="$STATE_FILE" ODD_FIELD="$1" node -e "
    try {
      const s = JSON.parse(require('fs').readFileSync(process.env.ODD_STATE_FILE, 'utf8'));
      console.log(s[process.env.ODD_FIELD] ?? '');
    } catch(e) { console.log(''); }
  " 2>/dev/null
}

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
CURRENT_PHASE=$(get_state_field "currentPhase")
BUILD_MODE=$(get_state_field "buildMode")

# Helper: check marker file exists and is not stale
# Default TTL is 24 hours (86400s) — build sessions can last many hours
marker_valid() {
  local marker="$1"
  local max_age="${2:-86400}"
  [ -f "$marker" ] || return 1
  local age=$(( $(date +%s) - $(stat -f %m "$marker" 2>/dev/null || stat -c %Y "$marker" 2>/dev/null || echo 0) ))
  [ "$age" -le "$max_age" ]
}

# Helper: is this a source code file (not config/docs/state)?
is_source_file() {
  local fp="$1"
  local project_dir
  project_dir=$(pwd)

  # Outside project — allow
  if [[ "$fp" == /* ]] && [[ "$fp" != "$project_dir"* ]]; then
    return 1
  fi
  # Non-source locations — allow
  if echo "$fp" | grep -qE '(\.odd/|docs/|memory/|MEMORY\.md|CLAUDE\.md|\.odd-flow)'; then
    return 1
  fi
  # Hook/skill/script files — allow
  if echo "$fp" | grep -qE '(hooks/|skills/|skill/|scripts/)'; then
    return 1
  fi
  # Config files — allow
  if echo "$fp" | grep -qE '(next\.config\.|postcss\.config\.|tailwind\.config\.|tsconfig|package\.json|\.env|drizzle\.config|vercel\.)'; then
    return 1
  fi
  return 0
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Gate dispatch
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

case "$GATE" in

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Agent — blocks spawn without confirmed brief
# ─────────────────────────────────────────────────────────────────────────────
brief-gate)
  [ "$TOOL_NAME" = "Agent" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0

  BRIEF_CONFIRMED=$(get_state_field "briefConfirmed")
  if [ "$BRIEF_CONFIRMED" != "true" ]; then
    # Allow brief-generation agents through
    AGENT_PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty' | head -c 200)
    if echo "$AGENT_PROMPT" | grep -qiE '(session.brief|session-brief|generate.*brief|write.*brief)'; then
      exit 0
    fi
    echo "ODD STUDIO [brief-gate]: Build agents blocked — session brief not confirmed." >&2
    echo "Run *export to generate the brief, then wait for domain expert confirmation." >&2
    exit 2
  fi

  # Brief confirmed — also check odd-flow sync
  if ! marker_valid ".odd/.odd-flow-phase-synced" 1800; then
    echo "ODD STUDIO [brief-gate]: Brief confirmed but odd-flow not synced. Run /odd-sync first." >&2
    exit 2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Agent — blocks spawn without full swarm init
# ─────────────────────────────────────────────────────────────────────────────
build-gate)
  [ "$TOOL_NAME" = "Agent" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0

  # Allow brief-generation and sync agents through
  AGENT_PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty' | head -c 300)
  if echo "$AGENT_PROMPT" | grep -qiE '(session.brief|session-brief|generate.*brief|odd-sync|fix.*hook|update.*hook)'; then
    exit 0
  fi

  if ! marker_valid ".odd/.odd-flow-agents-ready" 7200; then
    echo "ODD STUDIO [build-gate]: Task agents blocked — odd-flow swarm not initialised." >&2
    echo "Run the full 9-step swarm init sequence (see *build protocol step 7)." >&2
    exit 2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Write|Edit — blocks source writes without active build session
# ─────────────────────────────────────────────────────────────────────────────
# Two-marker system:
#   1. .odd/.odd-flow-swarm-active  — created by *build, 24h TTL (session marker)
#   2. .odd/.odd-flow-agent-token    — created by Task agents before each write batch, 120s TTL
#
# The orchestrator (main conversation) can read files and coordinate, but CANNOT
# write source code. Only Task agents can, and only after creating the agent token.
# This prevents the LLM from bypassing swarm coordination by editing files directly.
swarm-write)
  [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0
  is_source_file "$FILE_PATH" || exit 0

  # Gate 1: Build session must be active (swarm marker with 24h TTL)
  if ! marker_valid ".odd/.odd-flow-swarm-active" 86400; then
    echo "ODD STUDIO [swarm-write]: Source writes blocked — no active build session." >&2
    echo "Run *build to start a build session before writing source code." >&2
    echo "File blocked: $FILE_PATH" >&2
    exit 2
  fi

  # Debug session bypass: orchestrator writes allowed when *debug mode is active
  DEBUG_SESSION=$(get_state_field "debugSession")
  if [ "$DEBUG_SESSION" = "true" ]; then
    exit 0
  fi

  # Gate 2: Agent write token must be fresh (120s TTL)
  # Only Task agents create this token — the orchestrator must NOT.
  if ! marker_valid ".odd/.odd-flow-agent-token" 120; then
    echo "ODD STUDIO [swarm-write]: Source writes blocked — no agent write token." >&2
    echo "Only Task agents can write source code. The orchestrator must dispatch work, not write code directly." >&2
    echo "File blocked: $FILE_PATH" >&2
    exit 2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Edit|Write — blocks marking outcomes verified without checklist
# ─────────────────────────────────────────────────────────────────────────────
verify-gate)
  [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ] || exit 0

  # Only intercept writes to state.json
  echo "$FILE_PATH" | grep -q 'state\.json' || exit 0

  # Count verified statuses: only block if NEW outcomes are being marked verified
  # (not when existing verified outcomes are preserved in a full file write)
  if [ "$TOOL_NAME" = "Write" ]; then
    # Full file write — compare verified count against existing file
    NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
    NEW_VERIFIED=$(echo "$NEW_CONTENT" | grep -c '"buildStatus"[[:space:]]*:[[:space:]]*"verified"' || echo 0)
    if [ -f "$FILE_PATH" ]; then
      OLD_VERIFIED=$(grep -c '"buildStatus"[[:space:]]*:[[:space:]]*"verified"' "$FILE_PATH" || echo 0)
    else
      OLD_VERIFIED=0
    fi
    [ "$NEW_VERIFIED" -gt "$OLD_VERIFIED" ] || exit 0
  else
    # Edit — check if new_string introduces "verified" that old_string didn't have
    OLD_STRING=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
    NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
    OLD_HAS=$(echo "$OLD_STRING" | grep -c '"verified"' || echo 0)
    NEW_HAS=$(echo "$NEW_STRING" | grep -c '"verified"' || echo 0)
    [ "$NEW_HAS" -gt "$OLD_HAS" ] || exit 0
  fi

  if [ "$BUILD_MODE" = "debug" ]; then
    echo "ODD STUDIO [verify-gate]: Cannot mark outcomes verified while debug mode is active." >&2
    echo "Return buildMode to verify first, then run the verification walkthrough again." >&2
    exit 2
  fi

  if [ -f ".odd/.checkpoint-dirty" ] || [ ! -f ".odd/.checkpoint-clear" ]; then
    echo "ODD STUDIO [verify-gate]: Verification blocked — a fresh Checkpoint scan has not cleared the latest source changes." >&2
    echo "Run: npx @darrenjcoxon/vibeguard --security-only -o json" >&2
    exit 2
  fi

  VERIFIED_CONFIRMED=$(get_state_field "verificationConfirmed")
  if [ "$VERIFIED_CONFIRMED" != "true" ]; then
    echo "ODD STUDIO [verify-gate]: Cannot mark NEW outcomes as verified." >&2
    echo "Walk through the verification checklist first. Set verificationConfirmed: true after all steps pass." >&2
    exit 2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Bash — blocks commit while checkpoint is dirty
# ─────────────────────────────────────────────────────────────────────────────
checkpoint-gate)
  [ "$TOOL_NAME" = "Bash" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  echo "$COMMAND" | grep -qE 'git\s+commit' || exit 0

  if [ "$BUILD_MODE" = "debug" ]; then
    echo "ODD STUDIO [checkpoint-gate]: Commit blocked — debug mode is active." >&2
    echo "Resolve the failure, return to verify mode, then commit only after verification passes." >&2
    exit 2
  fi

  if [ -f ".odd/.checkpoint-dirty" ] || [ ! -f ".odd/.checkpoint-clear" ]; then
    echo "ODD STUDIO [checkpoint-gate]: Commit blocked — latest source changes have not passed Checkpoint." >&2
    echo "Run: npx @darrenjcoxon/vibeguard --security-only -o json" >&2
    exit 2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Edit|Write — blocks briefConfirmed without odd-flow store
# ─────────────────────────────────────────────────────────────────────────────
confirm-gate)
  [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ] || exit 0

  echo "$FILE_PATH" | grep -q 'state\.json' || exit 0

  NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')
  echo "$NEW_CONTENT" | grep -qE '"briefConfirmed"\s*:\s*true' || exit 0

  if [ ! -f ".odd/.odd-flow-brief-stored" ] && [ ! -f ".odd/.odd-flow-state-ready" ]; then
    echo "ODD STUDIO [confirm-gate]: Brief not stored in odd-flow memory. Store it first." >&2
    exit 2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PreToolUse: Bash — blocks git commit without odd-flow state stored
# ─────────────────────────────────────────────────────────────────────────────
commit-gate)
  [ "$TOOL_NAME" = "Bash" ] || exit 0
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  echo "$COMMAND" | grep -qE 'git\s+commit' || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0

  if [ ! -f ".odd/.odd-flow-state-ready" ]; then
    echo "" >&2
    echo "ODD STUDIO [commit-gate]: Commit blocked — odd-flow state not stored." >&2
    echo "Call mcp__odd-flow__memory_store key=odd-project-state first." >&2
    echo "" >&2
    exit 2
  fi

  # Marker consumed — next commit requires a fresh store
  rm -f ".odd/.odd-flow-state-ready"
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# UserPromptSubmit — warns every turn if build phase without swarm
# ─────────────────────────────────────────────────────────────────────────────
swarm-guard)
  [ "$CURRENT_PHASE" = "build" ] || exit 0

  # Suppress all warnings during active debug session — reduced ceremony is the point
  DEBUG_SESSION=$(get_state_field "debugSession")
  [ "$DEBUG_SESSION" = "true" ] && exit 0

  # Gate 1: Dirty state (commit without odd-flow store)
  if [ -f ".odd/.odd-flow-state-dirty" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "ODD STUDIO — STATE NOT SAVED TO ODD-FLOW"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  A git commit was made but .odd/state.json was NOT stored to odd-flow."
    echo "  DO THIS NOW:"
    echo "  1. mcp__odd-flow__memory_store key=odd-project-state namespace=odd-project upsert=true value=<.odd/state.json>"
    echo "  2. Bash: rm -f .odd/.odd-flow-state-dirty"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 0
  fi

  # Gate 2: Swarm not initialised
  if marker_valid ".odd/.odd-flow-swarm-active" 86400; then
    exit 0
  fi

  STALE=""
  if [ -f ".odd/.odd-flow-swarm-active" ]; then
    STALE=" (marker expired — re-init required)"
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ODD STUDIO — SWARM NOT INITIALISED${STALE}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  You are in build phase. Initialise the swarm with *build or *swarm."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Bash — auto-save state after git commit
# ─────────────────────────────────────────────────────────────────────────────
session-save)
  [ "$TOOL_NAME" = "Bash" ] || exit 0
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  echo "$COMMAND" | grep -qE 'git\s+commit' || exit 0

  # Update last-commit info in local state — pass data via env vars, never interpolate
  LAST_COMMIT=$(git log -1 --format="%H %s" 2>/dev/null || echo "unknown")
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  ODD_STATE_FILE="$STATE_FILE" ODD_COMMIT="$LAST_COMMIT" ODD_TIME="$TIMESTAMP" node -e "
    const fs = require('fs');
    try {
      const state = JSON.parse(fs.readFileSync(process.env.ODD_STATE_FILE, 'utf8'));
      state.lastCommit = process.env.ODD_COMMIT;
      state.lastSaved = process.env.ODD_TIME;
      state.lastCommitAt = process.env.ODD_TIME;
      fs.writeFileSync(process.env.ODD_STATE_FILE, JSON.stringify(state, null, 2));
    } catch(e) {}
  " 2>/dev/null

  # Refresh sync marker + set dirty marker
  touch .odd/.odd-flow-phase-synced 2>/dev/null
  touch .odd/.odd-flow-state-dirty 2>/dev/null
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Bash — refresh checkpoint markers after a successful scan
# ─────────────────────────────────────────────────────────────────────────────
checkpoint-validate)
  [ "$TOOL_NAME" = "Bash" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  echo "$COMMAND" | grep -qE '@darrenjcoxon/vibeguard|vibeguard' || exit 0

  EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_response.exit_code // .tool_output.exit_code // .exitCode // empty' 2>/dev/null || true)
  if [ -z "$EXIT_CODE" ] || [ "$EXIT_CODE" = "0" ]; then
    touch .odd/.checkpoint-clear 2>/dev/null
    rm -f .odd/.checkpoint-dirty 2>/dev/null
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Write|Edit state.json — blocks phase transition without Steps 9, 9b, 9d
# ─────────────────────────────────────────────────────────────────────────────
plan-complete-gate)
  [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || exit 0

  # Only intercept writes to state.json
  echo "$FILE_PATH" | grep -q 'state\.json' || exit 0

  # Check if new content changes currentPhase to "build"
  NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')
  echo "$NEW_CONTENT" | grep -qE '"currentPhase"[[:space:]]*:[[:space:]]*"build"' || exit 0

  # Verify all planning steps are complete
  TECH_STACK=$(echo "$NEW_CONTENT" | grep -oE '"techStackDecided"[[:space:]]*:[[:space:]]*(true|false)' | grep -c 'true' || echo 0)
  DESIGN=$(echo "$NEW_CONTENT" | grep -oE '"designApproachDecided"[[:space:]]*:[[:space:]]*(true|false)' | grep -c 'true' || echo 0)
  ARCH_DOC=$(echo "$NEW_CONTENT" | grep -oE '"architectureDocGenerated"[[:space:]]*:[[:space:]]*(true|false)' | grep -c 'true' || echo 0)

  if [ "$TECH_STACK" -eq 0 ] || [ "$DESIGN" -eq 0 ] || [ "$ARCH_DOC" -eq 0 ]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "ODD STUDIO [plan-complete-gate]: PHASE TRANSITION BLOCKED" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "  Cannot transition to build phase without completing planning:" >&2
    echo "" >&2
    [ "$TECH_STACK" -eq 0 ] && echo "  ❌ Step 9:  Technical architecture not decided (techStackDecided)" >&2
    [ "$DESIGN" -eq 0 ] && echo "  ❌ Step 9b: Design approach not decided (designApproachDecided)" >&2
    [ "$ARCH_DOC" -eq 0 ] && echo "  ❌ Step 9d: Architecture docs not generated (architectureDocGenerated)" >&2
    echo "" >&2
    echo "  Run *plan to continue with Rachel (Step 9, 9b, 9d)." >&2
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    exit 2
  fi

  # All checks passed — allow the transition
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: mcp__odd-flow__memory_store — creates ready marker
# ─────────────────────────────────────────────────────────────────────────────
store-validate)
  [ "$TOOL_NAME" = "mcp__odd-flow__memory_store" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0

  KEY=$(echo "$INPUT" | jq -r '.tool_input.key // empty')

  # MCP responses may be nested under tool_response or at root — check both
  if ! echo "$INPUT" | grep -qE '"success"[[:space:]]*:[[:space:]]*true'; then
    exit 0
  fi

  # Create the right marker based on what was stored
  case "$KEY" in
    odd-project-state)
      touch .odd/.odd-flow-state-ready 2>/dev/null
      rm -f .odd/.odd-flow-state-dirty 2>/dev/null
      ;;
    odd-session-brief-*)
      touch .odd/.odd-flow-brief-stored 2>/dev/null
      ;;
  esac
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: mcp__odd-flow__coordination_sync — creates agents-ready marker
# ─────────────────────────────────────────────────────────────────────────────
sync-validate)
  [ "$TOOL_NAME" = "mcp__odd-flow__coordination_sync" ] || exit 0
  [ "$CURRENT_PHASE" = "build" ] || exit 0

  touch .odd/.odd-flow-agents-ready 2>/dev/null
  touch .odd/.odd-flow-phase-synced 2>/dev/null
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Write|Edit — code elegance check
# ─────────────────────────────────────────────────────────────────────────────
code-quality)
  [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || exit 0

  # Only check source code files
  echo "$FILE_PATH" | grep -qiE '\.(ts|tsx|js|jsx|py|svelte|vue)$' || exit 0
  # Skip config, generated, test files
  echo "$FILE_PATH" | grep -qiE '(\.config\.|\.d\.ts|node_modules|\.next|dist/|build/|\.test\.|\.spec\.|__tests__)' && exit 0
  [ -f "$FILE_PATH" ] || exit 0

  ISSUES=""

  # File length (300 lines max)
  LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')
  if [ "$LINE_COUNT" -gt 300 ]; then
    ISSUES="$ISSUES\n  - File is $LINE_COUNT lines (limit: 300). Split into smaller modules."
  fi

  # Long function check (25 lines max)
  LONG_FUNCS=$(awk '
    /^[[:space:]]*(export )?(async )?(function |const [a-zA-Z]+ = (\([^)]*\)|[a-zA-Z]+) =>)/ {
      name = $0; gsub(/^[[:space:]]+/, "", name); start = NR; depth = 0; started = 0
      while ((getline line) > 0) {
        gsub(/[^{]/, "", line); openc = length(line)
        line2 = $0; gsub(/[^}]/, "", line2); closec = length(line2)
        if (openc > 0) started = 1; depth += openc - closec
        if (started && depth <= 0) {
          len = NR - start
          if (len > 25) printf "    %s (line %d, %d lines)\n", substr(name, 1, 60), start, len
          break
        }
      }
    }
  ' "$FILE_PATH")
  [ -n "$LONG_FUNCS" ] && ISSUES="$ISSUES\n  - Functions exceeding 25-line limit:\n$LONG_FUNCS"

  # Deep nesting (>3 levels)
  DEEP_LINES=$(awk '
    /^[[:space:]]{16,}[^ ]/ && !/^\s*[\/*]/ && !/^\s*\*/ && !/className/ && !/^\s*</ {
      count++; if (count <= 3) printf "    Line %d: %s\n", NR, substr($0, 1, 70)
    }
    END { if (count > 3) printf "    ... and %d more\n", count - 3 }
  ' "$FILE_PATH")
  [ -n "$DEEP_LINES" ] && ISSUES="$ISSUES\n  - Deep nesting detected (>3 levels):\n$DEEP_LINES"

  # Excessive imports (8 max)
  IMPORT_COUNT=$(grep -cE '^import ' "$FILE_PATH" 2>/dev/null || echo 0)
  [ "$IMPORT_COUNT" -gt 8 ] && ISSUES="$ISSUES\n  - $IMPORT_COUNT imports (limit: 8). Module may be too coupled."

  if [ -n "$ISSUES" ]; then
    echo "" >&2
    echo "ODD CODE EXCELLENCE: $(basename "$FILE_PATH")" >&2
    echo -e "$ISSUES" >&2
    echo "" >&2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Write|Edit — security baseline warnings + checkpoint dirty marker
# ─────────────────────────────────────────────────────────────────────────────
security-quality)
  [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || exit 0

  echo "$FILE_PATH" | grep -qiE '\.(ts|tsx|js|jsx|py|svelte|vue)$' || exit 0
  echo "$FILE_PATH" | grep -qiE '(\.config\.|\.d\.ts|node_modules|\.next|dist/|build/|\.test\.|\.spec\.|__tests__)' && exit 0
  [ -f "$FILE_PATH" ] || exit 0

  if [ "$CURRENT_PHASE" = "build" ]; then
    touch .odd/.checkpoint-dirty 2>/dev/null
    rm -f .odd/.checkpoint-clear 2>/dev/null
  fi

  ISSUES=""

  grep -qEi '\b(api[_-]?key|secret|token|password)\b[^=\n]{0,40}[:=][[:space:]]*["'\''][^"'\'']{8,}["'\'']' "$FILE_PATH" 2>/dev/null \
    && ISSUES="$ISSUES\n  - Possible hardcoded secret or credential literal"
  grep -q 'dangerouslySetInnerHTML' "$FILE_PATH" 2>/dev/null \
    && ISSUES="$ISSUES\n  - Unsafe HTML rendering detected — prove sanitisation or remove it"
  grep -qEi '(localStorage|sessionStorage)\.(setItem|getItem)\([^)]*(token|session|auth|jwt)' "$FILE_PATH" 2>/dev/null \
    && ISSUES="$ISSUES\n  - Client-side token or session storage detected"
  grep -qEi 'strategy[[:space:]]*:[[:space:]]*["'\'']jwt["'\'']' "$FILE_PATH" 2>/dev/null \
    && ISSUES="$ISSUES\n  - JWT session shortcut detected — prefer server-managed session state"
  grep -qEi '(rejectUnauthorized|NODE_TLS_REJECT_UNAUTHORIZED|skipCsrfCheck|verify)[[:space:]]*[:=][[:space:]]*(false|0|["'\'']false["'\''])' "$FILE_PATH" 2>/dev/null \
    && ISSUES="$ISSUES\n  - Security verification appears disabled"

  if [ -n "$ISSUES" ]; then
    echo "" >&2
    echo "ODD SECURITY BASELINE: $(basename "$FILE_PATH")" >&2
    echo -e "$ISSUES" >&2
    echo "" >&2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Write — session brief quality check
# ─────────────────────────────────────────────────────────────────────────────
brief-quality)
  [ "$TOOL_NAME" = "Write" ] || exit 0
  echo "$FILE_PATH" | grep -qE 'session-brief-[0-9]+\.md$' || exit 0
  [ -f "$FILE_PATH" ] || exit 0

  LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')
  ISSUES=""

  # Minimum length
  [ "$LINE_COUNT" -lt 200 ] && ISSUES="$ISSUES\n  - Brief is only $LINE_COUNT lines (minimum 200). Full walkthroughs likely missing."

  # Required sections
  for SECTION in "## Overview" "## Active Personas" "## Outcomes In Scope" "## Available From Previous" "## Build Sequence" "## Known Failure" "## Not In Scope"; do
    grep -q "$SECTION" "$FILE_PATH" 2>/dev/null || ISSUES="$ISSUES\n  - Missing required section: $SECTION"
  done

  # Walkthroughs and verifications per outcome
  OUTCOME_COUNT=$(grep -c "^### Outcome" "$FILE_PATH" 2>/dev/null || echo 0)
  WALKTHROUGH_COUNT=$(grep -c "^\*\*Walkthrough" "$FILE_PATH" 2>/dev/null || echo 0)
  VERIFICATION_COUNT=$(grep -c "^\*\*Verification" "$FILE_PATH" 2>/dev/null || echo 0)
  [ "$WALKTHROUGH_COUNT" -lt "$OUTCOME_COUNT" ] && ISSUES="$ISSUES\n  - $OUTCOME_COUNT outcomes but only $WALKTHROUGH_COUNT walkthroughs"
  [ "$VERIFICATION_COUNT" -lt "$OUTCOME_COUNT" ] && ISSUES="$ISSUES\n  - $OUTCOME_COUNT outcomes but only $VERIFICATION_COUNT verification sections"

  # Contracts per outcome
  CONTRACT_COUNT=$(grep -c "^\*\*Contracts exposed" "$FILE_PATH" 2>/dev/null || echo 0)
  [ "$CONTRACT_COUNT" -lt "$OUTCOME_COUNT" ] && ISSUES="$ISSUES\n  - $OUTCOME_COUNT outcomes but only $CONTRACT_COUNT contracts sections"

  if [ -n "$ISSUES" ]; then
    echo "" >&2
    echo "ODD BRIEF QUALITY: $(basename "$FILE_PATH") ($LINE_COUNT lines, $OUTCOME_COUNT outcomes)" >&2
    echo -e "$ISSUES" >&2
    echo "Regenerate before confirming." >&2
    echo "" >&2
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# PostToolUse: Write — outcome/persona quality check
# ─────────────────────────────────────────────────────────────────────────────
outcome-quality)
  [ "$TOOL_NAME" = "Write" ] || exit 0
  echo "$FILE_PATH" | grep -qE 'docs/(outcomes|personas)/' || exit 0
  [ -f "$FILE_PATH" ] || exit 0

  CONTENT=$(cat "$FILE_PATH")

  # Outcome quality
  if echo "$FILE_PATH" | grep -q 'docs/outcomes/'; then
    MISSING=""
    echo "$CONTENT" | grep -qiE 'Field 1.*Persona|## Persona' || MISSING="$MISSING\n  - Field 1 (Persona)"
    echo "$CONTENT" | grep -qiE 'Field 2.*Trigger|## Trigger' || MISSING="$MISSING\n  - Field 2 (Trigger)"
    echo "$CONTENT" | grep -qiE 'Field 3.*Walkthrough|## Walkthrough' || MISSING="$MISSING\n  - Field 3 (Walkthrough)"
    echo "$CONTENT" | grep -qiE 'Field 4.*Verif|## Verif' || MISSING="$MISSING\n  - Field 4 (Verification)"
    echo "$CONTENT" | grep -qiE 'Field 5.*Contracts|## Contracts' || MISSING="$MISSING\n  - Field 5 (Contracts Exposed)"
    echo "$CONTENT" | grep -qiE 'Field 6.*Dep|## Dep' || MISSING="$MISSING\n  - Field 6 (Dependencies)"

    BANNED=$(echo "$CONTENT" | grep -iE '\b(user story|user stories|sprint|epic|backlog|api endpoint|database schema|database table|json payload|http request)\b' | head -5)

    if [ -n "$MISSING" ] || [ -n "$BANNED" ]; then
      echo "" >&2
      echo "ODD OUTCOME QUALITY: $(basename "$FILE_PATH")" >&2
      [ -n "$MISSING" ] && { echo "Missing fields:" >&2; echo -e "$MISSING" >&2; }
      if [ -n "$BANNED" ]; then
        echo "Banned vocabulary detected:" >&2
        echo "$BANNED" | while IFS= read -r line; do echo "  > $line" >&2; done
      fi
      echo "" >&2
    fi
  fi

  # Persona quality
  if echo "$FILE_PATH" | grep -q 'docs/personas/'; then
    MISSING=""
    for DIM in Identity Reality Psychology Trigger History Success Constraints; do
      echo "$CONTENT" | grep -qiE "## $DIM|${DIM,,}" || MISSING="$MISSING\n  - $DIM dimension"
    done
    if [ -n "$MISSING" ]; then
      echo "" >&2
      echo "ODD PERSONA QUALITY: $(basename "$FILE_PATH")" >&2
      echo "Missing dimensions:" >&2
      echo -e "$MISSING" >&2
      echo "" >&2
    fi
  fi
  exit 0
  ;;

# ─────────────────────────────────────────────────────────────────────────────
# Unknown gate — pass through
# ─────────────────────────────────────────────────────────────────────────────
*)
  exit 0
  ;;

esac
