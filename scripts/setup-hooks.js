'use strict';
import fs from 'fs-extra';
import path from 'path';
import { ODD_HOOK_FILE as HOOK_FILE } from './assets.js';

// All ODD Studio gates, grouped by event + matcher.
// Each entry becomes one hooks[] item in settings.json pointing to:
//   odd-studio.sh <gate-name>
//
// Two-marker system (swarm-write gate):
//   1. .odd/.odd-flow-swarm-active  — created by *build, 24h TTL (session marker)
//   2. .odd/.odd-flow-agent-token    — created by Task agents, 120s TTL (write token)
//
// The orchestrator (main conversation) can read files and coordinate,
// but CANNOT write source code. Only Task agents can write source code,
// and only after creating the agent token. This prevents the LLM from
// bypassing swarm coordination by editing files directly from the main
// conversation.
const GATES = [
  // ── PreToolUse ──────────────────────────────────────────────────────────
  {
    event: 'PreToolUse',
    matcher: 'Agent',
    gates: [
      { name: 'brief-gate', timeout: 5, status: 'ODD brief gate...' },
      { name: 'build-gate', timeout: 5, status: 'ODD build gate...' },
    ],
  },
  {
    event: 'PreToolUse',
    matcher: 'Write',
    gates: [
      { name: 'swarm-write', timeout: 5, status: 'ODD swarm write gate...' },
      { name: 'verify-gate', timeout: 5, status: 'ODD verification gate...' },
      { name: 'confirm-gate', timeout: 5, status: 'ODD confirm gate...' },
    ],
  },
  {
    event: 'PreToolUse',
    matcher: 'Edit',
    gates: [
      { name: 'swarm-write', timeout: 5, status: 'ODD swarm write gate...' },
      { name: 'verify-gate', timeout: 5, status: 'ODD verification gate...' },
      { name: 'confirm-gate', timeout: 5, status: 'ODD confirm gate...' },
    ],
  },
  {
    event: 'PreToolUse',
    matcher: 'Bash',
    gates: [
      { name: 'checkpoint-gate', timeout: 5, status: 'ODD checkpoint gate...' },
      { name: 'commit-gate', timeout: 5, status: 'ODD commit gate...' },
    ],
  },
  // ── UserPromptSubmit ────────────────────────────────────────────────────
  {
    event: 'UserPromptSubmit',
    matcher: null,
    gates: [
      { name: 'swarm-guard', timeout: 5, status: 'ODD swarm guard...' },
    ],
  },
  // ── PostToolUse ─────────────────────────────────────────────────────────
  {
    event: 'PostToolUse',
    matcher: 'Write',
    gates: [
      { name: 'plan-complete-gate', timeout: 5, status: 'ODD plan complete gate...' },
      { name: 'state-dirty-mark', timeout: 5, status: 'ODD state dirty mark...' },
    ],
  },
  {
    event: 'PostToolUse',
    matcher: 'Edit',
    gates: [
      { name: 'plan-complete-gate', timeout: 5, status: 'ODD plan complete gate...' },
      { name: 'state-dirty-mark', timeout: 5, status: 'ODD state dirty mark...' },
    ],
  },
  {
    event: 'PostToolUse',
    matcher: 'Bash',
    gates: [
      { name: 'checkpoint-validate', timeout: 10, status: 'ODD checkpoint validate...' },
      { name: 'session-save', timeout: 10, status: 'ODD session save...' },
    ],
  },
  {
    event: 'PostToolUse',
    matcher: 'mcp__odd-flow__memory_store',
    gates: [
      { name: 'store-validate', timeout: 5, status: 'ODD store validate...' },
    ],
  },
  {
    event: 'PostToolUse',
    matcher: 'mcp__odd-flow__coordination_sync',
    gates: [
      { name: 'sync-validate', timeout: 5, status: 'ODD sync validate...' },
    ],
  },
  {
    event: 'PostToolUse',
    matcher: 'Write',
    gates: [
      { name: 'code-quality', timeout: 5, status: 'ODD code quality...' },
      { name: 'security-quality', timeout: 5, status: 'ODD security quality...' },
      { name: 'brief-quality', timeout: 5, status: 'ODD brief quality...' },
      { name: 'outcome-quality', timeout: 5, status: 'ODD outcome quality...' },
    ],
  },
  {
    event: 'PostToolUse',
    matcher: 'Edit',
    gates: [
      { name: 'code-quality', timeout: 5, status: 'ODD code quality...' },
      { name: 'security-quality', timeout: 5, status: 'ODD security quality...' },
    ],
  },
];

export default async function setupHooks(packageRoot, targetDir, options = {}) {
  const hookSource = path.join(packageRoot, 'hooks', HOOK_FILE);
  const hooksDest = path.join(targetDir, '.claude', 'hooks');
  const hookDest = path.join(hooksDest, HOOK_FILE);
  const settingsPath = path.join(targetDir, '.claude', 'settings.local.json');

  // Step 1: Copy the single hook script
  await fs.ensureDir(hooksDest);
  if (fs.existsSync(hookSource)) {
    await fs.copy(hookSource, hookDest, { overwrite: true });
    await fs.chmod(hookDest, 0o755);
  } else {
    throw new Error(`Hook script not found: ${hookSource}`);
  }

  // Step 2: Read or initialise project-local settings (backup existing first)
  await fs.ensureDir(path.dirname(settingsPath));
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + '.bak';
    await fs.copy(settingsPath, backupPath, { overwrite: true });
    settings = await fs.readJson(settingsPath);
  }
  if (!settings.hooks) settings.hooks = {};

  // Step 3: Remove all existing odd-studio hook entries (clean upgrade)
  for (const event of Object.keys(settings.hooks)) {
    if (Array.isArray(settings.hooks[event])) {
      settings.hooks[event] = settings.hooks[event].filter(
        (entry) => !entry._oddStudio
      );
    }
  }

  // Step 4: Register all gates
  for (const group of GATES) {
    const { event, matcher, gates } = group;
    if (!settings.hooks[event]) settings.hooks[event] = [];

    const entry = {
      _oddStudio: true,
      hooks: gates.map((gate) => ({
        type: 'command',
        command: `.claude/hooks/${HOOK_FILE} ${gate.name}`,
        timeout: gate.timeout,
        statusMessage: gate.status,
      })),
    };
    if (matcher) entry.matcher = matcher;

    settings.hooks[event].push(entry);
  }

  // Step 5: Write project-local settings
  await fs.writeJson(settingsPath, settings, { spaces: 2 });

  // Count total gate registrations
  const totalGates = GATES.reduce((sum, g) => sum + g.gates.length, 0);

  return {
    hookFile: HOOK_FILE,
    hookCount: totalGates,
    registrations: GATES.length,
  };
}
