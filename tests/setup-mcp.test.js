import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import setupMcp from '../scripts/setup-mcp.js';

const TMP = path.join(os.tmpdir(), 'odd-studio-test-mcp');

beforeEach(async () => {
  await fs.remove(TMP);
  await fs.ensureDir(TMP);
});

afterEach(async () => {
  await fs.remove(TMP);
});

describe('setupMcp', () => {
  describe('version pinning (audit #2)', () => {
    it('writes explicit @latest into .mcp.json', async () => {
      await setupMcp('claude-code', TMP);
      const config = await fs.readJson(path.join(TMP, '.mcp.json'));
      const args = config.mcpServers['odd-flow'].args;
      const joined = args.join(' ');
      expect(joined).toContain('odd-flow@latest');
    });

    it('writes explicit @latest into opencode.json', async () => {
      await setupMcp('opencode', TMP);
      const config = await fs.readJson(path.join(TMP, 'opencode.json'));
      const cmd = config.mcp['odd-flow'].command;
      const joined = cmd.join(' ');
      expect(joined).toContain('odd-flow@latest');
    });

    it('writes explicit @latest into the Codex plugin MCP config', async () => {
      await setupMcp('codex', TMP);
      const config = await fs.readJson(path.join(TMP, 'plugins', 'odd-studio', '.mcp.json'));
      const args = config.mcpServers['odd-flow'].args;
      expect(args.join(' ')).toContain('odd-flow@latest');
    });
  });

  describe('config backup (audit #5)', () => {
    it('creates .mcp.json.bak before modifying existing config', async () => {
      const mcpPath = path.join(TMP, '.mcp.json');
      await fs.writeJson(mcpPath, { mcpServers: { existing: {} } });

      await setupMcp('claude-code', TMP);

      expect(fs.existsSync(mcpPath + '.bak')).toBe(true);
      const backup = await fs.readJson(mcpPath + '.bak');
      expect(backup.mcpServers.existing).toBeDefined();
      expect(backup.mcpServers['odd-flow']).toBeUndefined();
    });

    it('creates opencode.json.bak before modifying existing config', async () => {
      const ocPath = path.join(TMP, 'opencode.json');
      await fs.writeJson(ocPath, { mcp: { existing: {} } });

      await setupMcp('opencode', TMP);

      expect(fs.existsSync(ocPath + '.bak')).toBe(true);
      const backup = await fs.readJson(ocPath + '.bak');
      expect(backup.mcp.existing).toBeDefined();
      expect(backup.mcp['odd-flow']).toBeUndefined();
    });

    it('creates a Codex MCP backup before modifying existing config', async () => {
      const codexPath = path.join(TMP, 'plugins', 'odd-studio', '.mcp.json');
      await fs.ensureDir(path.dirname(codexPath));
      await fs.writeJson(codexPath, { mcpServers: { existing: {} } });

      await setupMcp('codex', TMP);

      expect(fs.existsSync(codexPath + '.bak')).toBe(true);
      const backup = await fs.readJson(codexPath + '.bak');
      expect(backup.mcpServers.existing).toBeDefined();
      expect(backup.mcpServers['odd-flow']).toBeUndefined();
    });
  });

  describe('idempotency', () => {
    it('does not duplicate odd-flow entry on second run', async () => {
      await setupMcp('claude-code', TMP);
      const result = await setupMcp('claude-code', TMP);
      expect(result.mcpJsonUpdated).toBe(false);

      const config = await fs.readJson(path.join(TMP, '.mcp.json'));
      expect(Object.keys(config.mcpServers)).toHaveLength(1);
    });

    it('preserves existing MCP servers', async () => {
      const mcpPath = path.join(TMP, '.mcp.json');
      await fs.writeJson(mcpPath, {
        mcpServers: { 'my-server': { command: 'test' } },
      });

      await setupMcp('claude-code', TMP);

      const config = await fs.readJson(mcpPath);
      expect(config.mcpServers['my-server']).toBeDefined();
      expect(config.mcpServers['odd-flow']).toBeDefined();
    });

    it('does not duplicate odd-flow entry in the Codex config on second run', async () => {
      await setupMcp('codex', TMP);
      const result = await setupMcp('codex', TMP);
      expect(result.codexUpdated).toBe(false);

      const config = await fs.readJson(path.join(TMP, 'plugins', 'odd-studio', '.mcp.json'));
      expect(Object.keys(config.mcpServers)).toHaveLength(1);
    });
  });

  describe('agent targeting', () => {
    it('writes only .mcp.json for claude-code', async () => {
      await setupMcp('claude-code', TMP);
      expect(fs.existsSync(path.join(TMP, '.mcp.json'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'opencode.json'))).toBe(false);
    });

    it('writes only opencode.json for opencode', async () => {
      await setupMcp('opencode', TMP);
      expect(fs.existsSync(path.join(TMP, '.mcp.json'))).toBe(false);
      expect(fs.existsSync(path.join(TMP, 'opencode.json'))).toBe(true);
    });

    it('writes both for agent=both', async () => {
      await setupMcp('both', TMP);
      expect(fs.existsSync(path.join(TMP, '.mcp.json'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'opencode.json'))).toBe(true);
    });

    it('writes only the Codex plugin MCP config for codex', async () => {
      await setupMcp('codex', TMP);
      expect(fs.existsSync(path.join(TMP, 'plugins', 'odd-studio', '.mcp.json'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, '.mcp.json'))).toBe(false);
      expect(fs.existsSync(path.join(TMP, 'opencode.json'))).toBe(false);
    });

    it('writes all three configs for agent=all', async () => {
      await setupMcp('all', TMP);
      expect(fs.existsSync(path.join(TMP, '.mcp.json'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'opencode.json'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'plugins', 'odd-studio', '.mcp.json'))).toBe(true);
    });
  });
});
