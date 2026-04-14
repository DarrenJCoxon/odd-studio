import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import scaffoldProject from '../scripts/scaffold-project.js';

const TMP = path.join(os.tmpdir(), 'odd-studio-test-scaffold');

beforeEach(async () => {
  await fs.remove(TMP);
  await fs.ensureDir(TMP);
});

afterEach(async () => {
  await fs.remove(TMP);
});

describe('scaffoldProject', () => {
  describe('input validation (audit #10)', () => {
    it('rejects project names with shell metacharacters', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), '$(rm -rf /)', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects project names with backticks', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), '`whoami`', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects project names with semicolons', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), 'foo;rm -rf /', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects project names with spaces', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), 'my project', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects project names with quotes', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), 'foo"bar', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects project names starting with a dot', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), '.hidden', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects project names starting with a hyphen', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), '-flag', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('rejects empty project names', async () => {
      await expect(
        scaffoldProject(path.join(TMP, 'bad'), '', 'claude-code')
      ).rejects.toThrow('Invalid project name');
    });

    it('accepts valid project names', async () => {
      const dir = path.join(TMP, 'valid');
      const result = await scaffoldProject(dir, 'my-cool-app', 'claude-code');
      expect(result.targetDir).toBe(dir);
    });

    it('accepts names with dots and underscores', async () => {
      const dir = path.join(TMP, 'dotted');
      const result = await scaffoldProject(dir, 'my_app.v2', 'claude-code');
      expect(result.targetDir).toBe(dir);
    });
  });

  describe('project scaffolding', () => {
    it('creates .odd/state.json with project name', async () => {
      const dir = path.join(TMP, 'scaffold');
      await scaffoldProject(dir, 'test-project', 'claude-code');
      const state = await fs.readJson(path.join(dir, '.odd', 'state.json'));
      expect(state.projectName).toBe('test-project');
      expect(state.initialisedAt).toBeTruthy();
    });

    it('creates CLAUDE.md for claude-code agent', async () => {
      const dir = path.join(TMP, 'claude');
      await scaffoldProject(dir, 'test-project', 'claude-code');
      expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
    });

    it('creates AGENTS.md for codex agent', async () => {
      const dir = path.join(TMP, 'codex');
      await scaffoldProject(dir, 'test-project', 'codex');
      expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(true);
    });

    it('skips CLAUDE.md for opencode-only agent', async () => {
      const dir = path.join(TMP, 'opencode');
      await scaffoldProject(dir, 'test-project', 'opencode');
      expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(false);
    });

    it('creates both instruction files for agent=all', async () => {
      const dir = path.join(TMP, 'all');
      await scaffoldProject(dir, 'test-project', 'all');
      expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(true);
    });

    it('patches project name into CLAUDE.md', async () => {
      const dir = path.join(TMP, 'patched');
      await scaffoldProject(dir, 'test-project', 'claude-code');
      const content = await fs.readFile(path.join(dir, 'CLAUDE.md'), 'utf8');
      expect(content).toContain('test-project');
      expect(content).not.toContain('{{PROJECT_NAME}}');
    });

    it('does not overwrite existing files', async () => {
      const dir = path.join(TMP, 'existing');
      await fs.ensureDir(dir);
      await fs.writeFile(path.join(dir, 'CLAUDE.md'), 'my custom config');
      await scaffoldProject(dir, 'test-project', 'claude-code');
      const content = await fs.readFile(path.join(dir, 'CLAUDE.md'), 'utf8');
      expect(content).toBe('my custom config');
    });
  });
});
