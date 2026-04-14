import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import oddStudioPlugin, { isSourceCodePath } from '../plugins/odd-studio-plugin.js';

const TMP = path.join(os.tmpdir(), 'odd-studio-test-plugin-behavior');

function createBuildState() {
  return {
    currentPhase: 'build',
    briefConfirmed: true,
    verificationConfirmed: false,
    buildMode: 'build',
    checkpointStatus: 'clear',
    lastCommit: null,
    lastSaved: null,
    lastCommitAt: null,
  };
}

beforeEach(async () => {
  await fs.remove(TMP);
  await fs.ensureDir(path.join(TMP, '.odd'));
});

afterEach(async () => {
  process.chdir(path.resolve(import.meta.dirname, '..'));
  await fs.remove(TMP);
});

describe('OpenCode plugin behavior', () => {
  it('classifies source paths and excludes project docs/config safely', () => {
    expect(isSourceCodePath('src/app/page.tsx')).toBe(true);
    expect(isSourceCodePath('docs/outcomes/example-outcome.md')).toBe(false);
    expect(isSourceCodePath('scripts/setup-mcp.js')).toBe(false);
    expect(isSourceCodePath('.odd/state.json')).toBe(false);
    expect(isSourceCodePath('.claude/hooks/odd-studio.sh')).toBe(false);
    expect(isSourceCodePath('package.json')).toBe(false);
  });

  it('stores the same commit metadata fields as the shell hook', async () => {
    await fs.writeJson(path.join(TMP, '.odd', 'state.json'), createBuildState(), { spaces: 2 });
    process.chdir(TMP);

    execFileSync('git', ['init'], { cwd: TMP, stdio: 'ignore' });
    await fs.writeFile(path.join(TMP, 'README.md'), 'test');
    execFileSync('git', ['add', 'README.md'], { cwd: TMP, stdio: 'ignore' });
    execFileSync(
      'git',
      ['-c', 'user.name=ODD Studio', '-c', 'user.email=odd@example.com', 'commit', '-m', 'Initial commit'],
      { cwd: TMP, stdio: 'ignore' }
    );

    const plugin = oddStudioPlugin();
    plugin['tool.execute.after']({
      tool: { name: 'Bash' },
      input: { command: 'git commit -m "Initial commit"' },
      exitCode: 0,
    });

    const state = await fs.readJson(path.join(TMP, '.odd', 'state.json'));
    expect(state.lastCommit).toMatch(/[0-9a-f]{7,40} Initial commit/);
    expect(state.lastSaved).toMatch(/T/);
    expect(state.lastCommitAt).toBe(state.lastSaved);
  });
});
