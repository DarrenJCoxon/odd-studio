'use strict';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const OC_DIR = path.join(os.homedir(), '.config', 'opencode');
const CODEX_DIR = path.join(os.homedir(), '.codex');

/**
 * Detects which AI coding agent is installed on this machine.
 *
 * @param {string} override - 'claude-code', 'opencode', 'codex', 'both', 'all', or 'auto'
 * @param {{ existsSync?: (path: string) => boolean }} options
 * @returns {'claude-code' | 'opencode' | 'codex' | 'both' | 'all'}
 */
export default function detectAgent(override = 'auto', options = {}) {
  if (override !== 'auto') return override;
  const exists = options.existsSync || fs.existsSync;

  const hasClaude = exists(CLAUDE_DIR);
  const hasOpenCode = exists(OC_DIR);
  const hasCodex = exists(CODEX_DIR);

  if (hasClaude && hasOpenCode && hasCodex) return 'all';
  if (hasClaude && hasOpenCode) return 'both';
  if (hasClaude && hasCodex) return 'all';
  if (hasOpenCode && hasCodex) return 'all';
  if (hasCodex) return 'codex';
  if (hasOpenCode) return 'opencode';
  return 'claude-code';
}
