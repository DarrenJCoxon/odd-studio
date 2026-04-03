#!/usr/bin/env bash
# ODD Studio — git post-commit hook
#
# Install to your project with:
#   cp .odd/post-commit-hook.sh .git/hooks/post-commit
#   chmod +x .git/hooks/post-commit
#
# Or run: npx odd-studio install-git-hooks
#
# Why this exists:
# odd-session-save.sh (PostToolUse) covers commits made BY Claude.
# This hook covers commits made by the developer directly in the terminal.
# Together they ensure .ruflo-state-dirty is always set after a build-phase commit,
# regardless of who made it.
#
# The dirty marker is cleared only after:
#   1. mcp__ruflo__memory_store key=odd-project-state (saves state to ruflo)
#   2. rm -f .odd/.ruflo-state-dirty
#
# odd-swarm-guard.sh (UserPromptSubmit) blocks EVERY Claude turn until cleared.

STATE_FILE=".odd/state.json"

if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

CURRENT_PHASE=$(node -e "
  try {
    const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
    console.log(s.currentPhase || '');
  } catch(e) { console.log(''); }
" 2>/dev/null)

if [ "$CURRENT_PHASE" = "build" ]; then
  touch .odd/.ruflo-state-dirty
fi

exit 0
