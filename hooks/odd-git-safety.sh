#!/usr/bin/env bash
# odd-git-safety.sh
# ODD Studio — Git Safety Hook (PreToolUse: Bash)
#
# Intercepts dangerous git commands before they execute.
# Protects against force-push, hard-reset, and branch deletion
# that could destroy work in progress.
#
# Exit 0  → allow the command
# Exit 2  → block the command (Claude will not execute it)
# Stderr  → message shown to the user

COMMAND="${CLAUDE_TOOL_INPUT:-}"

# ── Helper ────────────────────────────────────────────────────────────────────
block() {
  echo "🔒 ODD GIT SAFETY BLOCK: $1" >&2
  echo "" >&2
  echo "$2" >&2
  echo "" >&2
  echo "To override: commit your work first, then re-run with explicit intent." >&2
  exit 2
}

warn() {
  echo "⚠️  ODD GIT SAFETY WARNING: $1" >&2
  echo "$2" >&2
  # Warnings don't block — they inform
}

# ── Only check git commands ───────────────────────────────────────────────────
if ! echo "$COMMAND" | grep -qE '^\s*(git\s)'; then
  exit 0
fi

# ── Force push ────────────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+push.*(--force|-f)(\s|$)'; then
  block \
    "Force push detected." \
    "Force-pushing rewrites remote history and can permanently destroy teammates' work.
ODD Studio never force-pushes. If you need to update a remote branch:
  - Use: git push --force-with-lease  (safer — fails if remote has new commits)
  - Or create a new branch for your changes"
fi

# ── Force push to main/master ─────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+push.*--force-with-lease.*(main|master)'; then
  block \
    "Force push to main/master detected." \
    "ODD Studio never force-pushes to the main branch.
This is a non-reversible operation on your primary branch.
Create a PR and merge instead."
fi

# ── Hard reset ────────────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  # Check if there are uncommitted changes first
  if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
    # Working tree is clean — allow hard reset
    exit 0
  else
    block \
      "Hard reset with uncommitted changes detected." \
      "You have uncommitted changes that would be permanently lost.
ODD Studio blocked this to protect your work.
Options:
  - git stash           (save changes temporarily)
  - git commit -am 'WIP: saving before reset'  (commit first)
  - git diff            (review what would be lost)"
  fi
fi

# ── Discard all changes ───────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+checkout\s+--?\s*\.'; then
  block \
    "Discard all changes (git checkout -- .) detected." \
    "This would permanently discard all uncommitted changes in your working tree.
ODD Studio blocked this to protect your work.
Options:
  - git stash           (save changes temporarily)
  - git diff            (review what would be lost)
  - git commit -am 'WIP'  (commit first)"
fi

# ── git restore all ───────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+restore\s+\.'; then
  block \
    "Restore all files (git restore .) detected." \
    "This would permanently discard all unstaged changes.
Commit or stash your work first."
fi

# ── git clean ─────────────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+clean\s+.*-[a-zA-Z]*f'; then
  block \
    "git clean -f detected." \
    "This permanently deletes untracked files with no recovery path.
ODD Studio blocked this.
Use git status to review untracked files before deleting them."
fi

# ── Force branch delete ───────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+branch\s+(-D|--delete --force)'; then
  BRANCH=$(echo "$COMMAND" | grep -oE '(-D|--delete --force)\s+\S+' | awk '{print $2}')
  warn \
    "Force branch deletion: $BRANCH" \
    "If this branch has unmerged commits they will be lost.
Verify the branch is fully merged before deleting."
  # Warning only — does not block. Claude will proceed but user is informed.
fi

# ── Amend published commits ───────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+commit.*--amend'; then
  # Check if HEAD is pushed to a remote
  if git log --oneline "@{u}..HEAD" 2>/dev/null | grep -q .; then
    # HEAD has commits not on remote — amend is safe
    exit 0
  elif git rev-parse "@{u}" >/dev/null 2>&1; then
    block \
      "Amending a published commit." \
      "This commit has been pushed to the remote.
Amending it will require a force-push, which rewrites history.
Instead: create a new commit with your changes."
  fi
fi

# ── Skip hooks ────────────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE '(--no-verify|-n)\s'; then
  block \
    "--no-verify flag detected." \
    "ODD Studio never skips pre-commit hooks (--no-verify).
Hooks exist to protect build quality. If a hook is failing:
  1. Read the error carefully
  2. Fix the underlying issue
  3. Commit cleanly"
fi

exit 0
