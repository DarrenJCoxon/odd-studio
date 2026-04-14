import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN_PATH = path.join(ROOT, 'plugins', 'odd-studio-plugin.js');
const GATES_PATH = path.join(ROOT, 'plugins', 'plugin-gates.js');
const MARKERS_PATH = path.join(ROOT, 'plugins', 'plugin-markers.js');
const PATHS_PATH = path.join(ROOT, 'plugins', 'plugin-paths.js');
const CHECKS_PATH = path.join(ROOT, 'plugins', 'plugin-quality-checks.js');
const HOOK_PATH = path.join(ROOT, 'hooks', 'odd-studio.sh');

describe('OpenCode plugin parity (audit #7)', () => {
  it('ships a modular plugin surface', async () => {
    for (const filePath of [PLUGIN_PATH, GATES_PATH, MARKERS_PATH, PATHS_PATH, CHECKS_PATH, HOOK_PATH]) {
      expect(await fs.pathExists(filePath)).toBe(true);
    }
  });

  it('plugin is valid JavaScript (ESM)', async () => {
    const mod = await import(PLUGIN_PATH);
    expect(typeof mod.default).toBe('function');
  });

  it('plugin exports isSourceCodePath for direct tests', async () => {
    const mod = await import(PLUGIN_PATH);
    expect(typeof mod.isSourceCodePath).toBe('function');
  });

  it('gates module wires pre, post, and chat hooks', async () => {
    const mod = await import(GATES_PATH);
    expect(typeof mod.createBeforeHook).toBe('function');
    expect(typeof mod.createAfterHook).toBe('function');
    expect(typeof mod.createChatHook).toBe('function');
  });

  it('markers module uses time-based validation', async () => {
    const content = await fs.readFile(MARKERS_PATH, 'utf8');
    expect(content).toContain('mtimeMs');
    expect(content).toContain('markerValid');
  });

  it('gates module enforces the expected marker TTLs', async () => {
    const content = await fs.readFile(GATES_PATH, 'utf8');
    expect(content).toContain('1800000');
    expect(content).toContain('7200000');
    expect(content).toContain('3600000');
    expect(content).toContain('120000');
  });

  it('gates module consumes and refreshes markers in the expected places', async () => {
    const content = await fs.readFile(GATES_PATH, 'utf8');
    expect(content).toContain("removeMarker('.odd-flow-state-ready')");
    expect(content).toContain("touchMarker('.odd-flow-phase-synced')");
    expect(content).toContain("touchMarker('.odd-flow-state-dirty')");
    expect(content).toContain("removeMarker('.odd-flow-state-dirty')");
    expect(content).toContain("touchMarker('.odd-flow-agents-ready')");
    expect(content).toContain("touchMarker('.checkpoint-dirty')");
    expect(content).toContain("touchMarker('.checkpoint-clear')");
    expect(content).toContain("removeMarker('.checkpoint-clear')");
  });

  it('quality checks module contains the expected checks', async () => {
    const content = await fs.readFile(CHECKS_PATH, 'utf8');
    expect(content).toContain('checkCodeElegance');
    expect(content).toContain('checkSecurityBaseline');
    expect(content).toContain('checkOutcomeQuality');
    expect(content).toContain('checkPersonaQuality');
    expect(content).toContain('checkBriefQuality');
    expect(content).toContain('300');
    expect(content).toContain('25');
    expect(content).toContain('16');
    expect(content).toContain('200');
    expect(content).toContain('walkthroughCount');
    expect(content).toContain('verificationCount');
    expect(content).toContain('contractCount');
    expect(content).toContain('dangerouslySetInnerHTML');
    expect(content).toContain("strategy\\s*:\\s*['\"]jwt['\"]");
  });

  it('path policy module excludes the same path families as the shell hook', async () => {
    const content = await fs.readFile(PATHS_PATH, 'utf8');
    const excludedPatterns = ['odd\\/', 'docs\\/', 'CLAUDE\\.md', 'hooks\\/', 'skills\\/', 'scripts\\/', 'next\\.config\\.', 'tailwind\\.config\\.', 'tsconfig', 'package\\.json', '\\.env', 'drizzle\\.config'];
    for (const pattern of excludedPatterns) {
      expect(content).toContain(pattern);
    }
  });
});
