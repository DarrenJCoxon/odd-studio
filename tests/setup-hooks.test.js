import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import setupHooks from '../scripts/setup-hooks.js';

const TMP = path.join(os.tmpdir(), 'odd-studio-test-hooks');
const PKG_ROOT = path.resolve(import.meta.dirname, '..');

beforeEach(async () => {
  await fs.remove(TMP);
  await fs.ensureDir(TMP);
});

afterEach(async () => {
  await fs.remove(TMP);
});

describe('setupHooks', () => {
  describe('config backup (audit #5)', () => {
    it('creates settings.local.json.bak before modifying existing settings', async () => {
      const settingsPath = path.join(TMP, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeJson(settingsPath, { existing: true, hooks: {} });

      await setupHooks(PKG_ROOT, TMP);

      expect(fs.existsSync(settingsPath + '.bak')).toBe(true);
      const backup = await fs.readJson(settingsPath + '.bak');
      expect(backup.existing).toBe(true);
    });
  });

  describe('hook installation', () => {
    it('copies odd-studio.sh to .claude/hooks/', async () => {
      await setupHooks(PKG_ROOT, TMP);
      const hookPath = path.join(TMP, '.claude', 'hooks', 'odd-studio.sh');
      expect(fs.existsSync(hookPath)).toBe(true);
    });

    it('makes odd-studio.sh executable', async () => {
      await setupHooks(PKG_ROOT, TMP);
      const hookPath = path.join(TMP, '.claude', 'hooks', 'odd-studio.sh');
      const stats = await fs.stat(hookPath);
      const isExecutable = (stats.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });

    it('writes hook registrations to settings.local.json', async () => {
      const result = await setupHooks(PKG_ROOT, TMP);
      const settingsPath = path.join(TMP, '.claude', 'settings.local.json');
      const settings = await fs.readJson(settingsPath);

      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.PreToolUse).toBeDefined();
      expect(settings.hooks.PostToolUse).toBeDefined();
      expect(settings.hooks.UserPromptSubmit).toBeDefined();
      expect(result.hookCount).toBeGreaterThan(0);
    });

    it('marks all registrations with _oddStudio flag', async () => {
      await setupHooks(PKG_ROOT, TMP);
      const settingsPath = path.join(TMP, '.claude', 'settings.local.json');
      const settings = await fs.readJson(settingsPath);

      for (const event of Object.keys(settings.hooks)) {
        for (const entry of settings.hooks[event]) {
          expect(entry._oddStudio).toBe(true);
        }
      }
    });
  });

  describe('clean upgrade', () => {
    it('removes old ODD entries before adding new ones', async () => {
      await setupHooks(PKG_ROOT, TMP);
      const result = await setupHooks(PKG_ROOT, TMP);

      const settingsPath = path.join(TMP, '.claude', 'settings.local.json');
      const settings = await fs.readJson(settingsPath);

      const allEntries = Object.values(settings.hooks).flat();
      const oddEntries = allEntries.filter(e => e._oddStudio);
      expect(oddEntries.length).toBe(result.registrations);
    });

    it('preserves non-ODD hook entries', async () => {
      const settingsPath = path.join(TMP, '.claude', 'settings.local.json');
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeJson(settingsPath, {
        hooks: {
          PreToolUse: [{ custom: true, hooks: [{ type: 'command', command: 'echo hi' }] }],
        },
      });

      await setupHooks(PKG_ROOT, TMP);

      const settings = await fs.readJson(settingsPath);
      const customEntries = settings.hooks.PreToolUse.filter(e => !e._oddStudio);
      expect(customEntries).toHaveLength(1);
      expect(customEntries[0].custom).toBe(true);
    });
  });
});
