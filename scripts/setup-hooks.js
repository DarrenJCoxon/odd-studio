'use strict';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const HOOKS_DEST = path.join(os.homedir(), '.claude', 'hooks');

// The hooks odd-studio installs, keyed by filename
const ODD_HOOKS = {
  'odd-git-safety.sh': {
    event: 'PreToolUse',
    matcher: 'Bash',
    timeout: 5,
    statusMessage: '🔒 ODD git safety check...',
  },
  'odd-destructive-guard.sh': {
    event: 'PreToolUse',
    matcher: 'Bash',
    timeout: 5,
    statusMessage: '🛡️ ODD destructive command guard...',
  },
  'odd-outcome-quality.sh': {
    event: 'PostToolUse',
    matcher: 'Write',
    timeout: 5,
    statusMessage: '🎯 ODD outcome quality check...',
  },
  'odd-ui-check.sh': {
    event: 'PostToolUse',
    matcher: 'Edit',
    timeout: 3,
    statusMessage: '🎨 ODD UI quality reminder...',
  },
  'odd-session-save.sh': {
    event: 'PostToolUse',
    matcher: 'Bash',
    timeout: 10,
    statusMessage: '💾 ODD session save...',
  },
  'odd-pre-build.sh': {
    event: 'PreToolUse',
    matcher: 'Bash',
    timeout: 5,
    statusMessage: '🏗️ ODD build safety check...',
  },
  'odd-code-elegance.sh': {
    event: 'PostToolUse',
    matcher: 'Write',
    timeout: 5,
    statusMessage: '✨ ODD code elegance check...',
  },
  'odd-brief-gate.sh': {
    event: 'PreToolUse',
    matcher: 'Agent',
    timeout: 5,
    statusMessage: '📋 ODD brief gate check...',
  },
  'odd-brief-quality.sh': {
    event: 'PostToolUse',
    matcher: 'Write',
    timeout: 5,
    statusMessage: '📋 ODD brief quality check...',
  },
  'odd-commit-gate.sh': {
    event: 'PreToolUse',
    matcher: 'Bash',
    timeout: 5,
    statusMessage: '🔒 ODD commit gate check...',
  },
  'odd-verify-gate.sh': {
    event: 'PreToolUse',
    matcher: 'Edit',
    timeout: 5,
    statusMessage: '✅ ODD verification gate...',
  },
  'odd-ruflo-build-gate.sh': {
    event: 'PreToolUse',
    matcher: 'Agent',
    timeout: 5,
    statusMessage: '🔗 ODD ruflo build gate...',
  },
  'odd-ruflo-confirm-gate.sh': {
    event: 'PreToolUse',
    matcher: 'Edit',
    timeout: 5,
    statusMessage: '🔗 ODD ruflo confirm gate...',
  },
  'odd-ruflo-confirm-gate-write.sh': {
    event: 'PreToolUse',
    matcher: 'Write',
    timeout: 5,
    statusMessage: '🔗 ODD ruflo confirm gate...',
    _aliasOf: 'odd-ruflo-confirm-gate.sh',
  },
  'odd-scanner-cleanup.sh': {
    event: 'PostToolUse',
    matcher: 'Bash',
    timeout: 10,
    statusMessage: '🧹 ODD scanner cleanup...',
  },
  'odd-swarm-write-gate.sh': {
    event: 'PreToolUse',
    matcher: 'Write',
    timeout: 5,
    statusMessage: '🔒 ODD swarm write gate...',
  },
  'odd-swarm-write-gate-edit.sh': {
    event: 'PreToolUse',
    matcher: 'Edit',
    timeout: 5,
    statusMessage: '🔒 ODD swarm edit gate...',
    _aliasOf: 'odd-swarm-write-gate.sh',
  },
};

export default async function setupHooks(packageRoot, options = {}) {
  const hooksSource = path.join(packageRoot, 'hooks');

  // Copy hook scripts to ~/.claude/hooks/
  await fs.ensureDir(HOOKS_DEST);
  for (const hookFile of Object.keys(ODD_HOOKS)) {
    const sourceFile = ODD_HOOKS[hookFile]._aliasOf || hookFile;
    const src = path.join(hooksSource, sourceFile);
    const dest = path.join(HOOKS_DEST, sourceFile);
    if (fs.existsSync(src)) {
      await fs.copy(src, dest, { overwrite: true });
      await fs.chmod(dest, 0o755);
    }
  }

  // Read or initialise settings.json
  await fs.ensureDir(path.dirname(SETTINGS_PATH));
  let settings = {};
  if (fs.existsSync(SETTINGS_PATH)) {
    settings = await fs.readJson(SETTINGS_PATH);
  }
  if (!settings.hooks) settings.hooks = {};

  // Build hook entries
  const hooksByEvent = {};
  for (const [hookFile, config] of Object.entries(ODD_HOOKS)) {
    const { event, matcher, timeout, statusMessage } = config;
    const commandFile = config._aliasOf || hookFile;
    if (!hooksByEvent[event]) hooksByEvent[event] = {};
    if (!hooksByEvent[event][matcher]) hooksByEvent[event][matcher] = [];
    hooksByEvent[event][matcher].push({
      type: 'command',
      command: path.join(HOOKS_DEST, commandFile),
      timeout,
      statusMessage,
    });
  }

  // Merge into existing hooks, tagged with odd-studio so we can upgrade cleanly
  for (const [event, matchers] of Object.entries(hooksByEvent)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    for (const [matcher, hookList] of Object.entries(matchers)) {
      // Remove existing odd-studio hooks for this matcher (clean upgrade)
      settings.hooks[event] = settings.hooks[event].filter(
        (entry) => !(entry.matcher === matcher && entry._oddStudio)
      );
      settings.hooks[event].push({
        matcher,
        _oddStudio: true,
        hooks: hookList,
      });
    }
  }

  await fs.writeJson(SETTINGS_PATH, settings, { spaces: 2 });

  return { hookCount: Object.keys(ODD_HOOKS).length };
}
