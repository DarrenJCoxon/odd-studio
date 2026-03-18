#!/usr/bin/env bash
# odd-destructive-guard.sh
# ODD Studio — Destructive Command Guard (PreToolUse: Bash)
#
# Blocks or warns on shell commands that could cause irreversible damage:
# rm -rf, overwriting critical files, dropping databases, etc.

COMMAND="${CLAUDE_TOOL_INPUT:-}"

block() {
  echo "🛡️ ODD DESTRUCTIVE GUARD: $1" >&2
  echo "" >&2
  echo "$2" >&2
  exit 2
}

warn() {
  echo "⚠️  ODD DESTRUCTIVE GUARD WARNING: $1" >&2
  echo "$2" >&2
}

# ── rm -rf ────────────────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)'; then
  TARGET=$(echo "$COMMAND" | grep -oE 'rm\s+-[a-zA-Z]+\s+\S+' | awk '{print $3}')

  # Always block rm -rf on common dangerous targets
  if echo "$TARGET" | grep -qE '^(/|~|\$HOME|\.\.)'; then
    block \
      "rm -rf on root-level or parent directory: $TARGET" \
      "This would recursively delete critical system or project files.
ODD Studio always blocks rm -rf on potentially dangerous paths."
  fi

  # Block rm -rf on the project docs/ directory
  if echo "$TARGET" | grep -qE '(docs|personas|outcomes|plan\.md|contract-map)'; then
    block \
      "rm -rf on ODD project documentation: $TARGET" \
      "This would destroy your persona, outcome, and plan documents.
These are your build specifications — deleting them means losing your planning work.
If you genuinely need to remove a file, delete it specifically by name."
  fi

  # Block rm -rf on .claude/
  if echo "$TARGET" | grep -qE '\.claude'; then
    block \
      "rm -rf on .claude/ directory." \
      "This would remove your Claude Code skills, hooks, and settings.
Run 'odd-studio upgrade' to update, or edit settings manually."
  fi

  # Warn (don't block) on other rm -rf
  warn \
    "rm -rf detected: $COMMAND" \
    "Ensure this is intentional — recursive deletion cannot be undone."
fi

# ── Overwriting .env files ────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE '>\s*\.env(\s|$)'; then
  block \
    "Overwriting .env file detected." \
    "ODD Studio never overwrites .env files — they contain credentials.
Edit .env manually or use a specific key: echo 'KEY=value' >> .env"
fi

# ── Committing secrets ────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'git\s+(add|commit).*\.env'; then
  block \
    "Attempting to commit .env file." \
    "ODD Studio never commits .env files — they contain credentials.
Add .env to .gitignore if it isn't already:
  echo '.env' >> .gitignore"
fi

# ── Dropping databases ────────────────────────────────────────────────────────
if echo "$COMMAND" | grep -qiE '(drop\s+database|dropdb|DROP\s+TABLE.*CASCADE)'; then
  warn \
    "Database destructive operation detected: $COMMAND" \
    "Ensure you are targeting the development database, not production.
ODD Studio recommends confirming the DATABASE_URL before destructive DB operations."
fi

# ── Killing all node processes ────────────────────────────────────────────────
if echo "$COMMAND" | grep -qE 'kill\s+-9\s+(all|-1|0)'; then
  warn \
    "kill -9 all processes detected." \
    "This terminates all processes for your user, including any development servers.
Use kill -9 <PID> to target a specific process."
fi

# ── curl | bash (pipe to shell) ───────────────────────────────────────────────
if echo "$COMMAND" | grep -qE '(curl|wget).*\|\s*(bash|sh|zsh)'; then
  warn \
    "Pipe-to-shell pattern detected: $COMMAND" \
    "Executing remote scripts directly is a security risk.
Consider downloading and reviewing the script before executing."
fi

exit 0
