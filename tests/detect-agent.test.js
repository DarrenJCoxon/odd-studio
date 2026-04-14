import { describe, it, expect } from 'vitest';
import path from 'path';
import detectAgent from '../scripts/detect-agent.js';

describe('detectAgent', () => {
  it('returns override when not auto', () => {
    expect(detectAgent('claude-code')).toBe('claude-code');
    expect(detectAgent('opencode')).toBe('opencode');
    expect(detectAgent('codex')).toBe('codex');
    expect(detectAgent('both')).toBe('both');
    expect(detectAgent('all')).toBe('all');
  });

  it('returns a valid agent type for auto', () => {
    const result = detectAgent('auto');
    expect(['claude-code', 'opencode', 'codex', 'both', 'all']).toContain(result);
  });

  it('defaults to auto when no argument provided', () => {
    const result = detectAgent();
    expect(['claude-code', 'opencode', 'codex', 'both', 'all']).toContain(result);
  });

  it('detects codex when it is the only installed agent', () => {
    const existsSync = (filePath) => filePath.endsWith('.codex');
    expect(detectAgent('auto', { existsSync })).toBe('codex');
  });

  it('detects all when codex is installed alongside another supported agent', () => {
    const existsSync = (filePath) => filePath.endsWith('.codex') || filePath.endsWith(path.join('.config', 'opencode'));
    expect(detectAgent('auto', { existsSync })).toBe('all');
  });
});
