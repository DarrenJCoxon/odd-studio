#!/usr/bin/env bash
# odd-ui-check.sh
# ODD Studio — UI Quality Reminder (PostToolUse: Edit)
#
# After editing UI/frontend files, surfaces accessibility and
# mobile-first reminders. Educational, not blocking.

FILE_PATH="${CLAUDE_TOOL_RESULT_FILE:-}"

# ── Only check frontend files ─────────────────────────────────────────────────
if ! echo "$FILE_PATH" | grep -qiE '\.(tsx|jsx|html|svelte|vue)$'; then
  exit 0
fi

# Only run ~20% of the time to avoid noise (sample by PID)
if [ $(( $$ % 5 )) -ne 0 ]; then
  exit 0
fi

CONTENT=""
if [ -f "$FILE_PATH" ]; then
  CONTENT=$(cat "$FILE_PATH")
fi

ISSUES=""

# ── Accessibility checks ──────────────────────────────────────────────────────

# img without alt
if echo "$CONTENT" | grep -qE '<img[^>]+(?!alt=)'; then
  if echo "$CONTENT" | grep -qE '<img' && ! echo "$CONTENT" | grep -qE '<img[^>]+alt='; then
    ISSUES="$ISSUES\n  • <img> elements should have alt= attributes (screen reader accessibility)"
  fi
fi

# Buttons without accessible text
if echo "$CONTENT" | grep -qE '<button[^>]*>\s*<'; then
  ISSUES="$ISSUES\n  • Buttons containing only icons need aria-label= for screen readers"
fi

# Interactive elements without focus management
if echo "$CONTENT" | grep -qE 'onClick|onPress' && ! echo "$CONTENT" | grep -qE '(focus|tabIndex|onKeyDown|onKeyPress|role=)'; then
  ISSUES="$ISSUES\n  • Interactive elements need keyboard support (onKeyDown or role= + tabIndex)"
fi

# Hardcoded colours instead of tokens
if echo "$CONTENT" | grep -qE '(style=.*color:\s*#|style=.*background:\s*#)'; then
  ISSUES="$ISSUES\n  • Hardcoded colours detected — use Tailwind tokens or CSS variables for theme consistency"
fi

# Non-responsive fixed widths
if echo "$CONTENT" | grep -qE 'width:\s*[0-9]{3,}px'; then
  ISSUES="$ISSUES\n  • Fixed pixel widths may break on mobile — prefer Tailwind responsive classes (w-full, max-w-*)"
fi

# ── Output coaching ───────────────────────────────────────────────────────────
if [ -n "$ISSUES" ]; then
  echo "" >&2
  echo "🎨 ODD UI QUALITY REMINDER: $(basename "$FILE_PATH")" >&2
  echo "" >&2
  echo "Things to check before marking this UI outcome verified:" >&2
  echo -e "$ISSUES" >&2
  echo "" >&2
  echo "Remember: every UI outcome must be verified on a mobile screen before it passes." >&2
  echo "Resize your browser to 375px wide and walk through your verification steps." >&2
  echo "" >&2
fi

exit 0
