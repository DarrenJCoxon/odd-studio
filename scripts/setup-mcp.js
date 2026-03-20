'use strict';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const MCP_JSON_PATH = path.join(os.homedir(), '.mcp.json');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const RUFLO_SERVER_ENTRY = {
  type: 'stdio',
  command: 'npx',
  args: ['ruflo@latest', 'mcp', 'start'],
  env: {},
};

/**
 * Configures the ruflo MCP server so that cross-session memory works.
 *
 * Two writes required:
 *   1. ~/.mcp.json — defines the server (npx ruflo@latest mcp start)
 *   2. ~/.claude/settings.json — adds "ruflo" to enabledMcpjsonServers
 *
 * Both are idempotent: existing entries are left untouched.
 */
export default async function setupMcp() {
  const result = { mcpJsonUpdated: false, settingsUpdated: false };

  // ── 1. Add ruflo to ~/.mcp.json ────────────────────────────────────────────
  let mcpConfig = { mcpServers: {} };
  if (fs.existsSync(MCP_JSON_PATH)) {
    try {
      mcpConfig = await fs.readJson(MCP_JSON_PATH);
    } catch {
      // Corrupt file — start fresh but preserve any valid content
      mcpConfig = { mcpServers: {} };
    }
  }
  if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};

  if (!mcpConfig.mcpServers.ruflo) {
    mcpConfig.mcpServers.ruflo = RUFLO_SERVER_ENTRY;
    await fs.writeJson(MCP_JSON_PATH, mcpConfig, { spaces: 2 });
    result.mcpJsonUpdated = true;
  }

  // ── 2. Enable ruflo in ~/.claude/settings.json ─────────────────────────────
  await fs.ensureDir(path.join(os.homedir(), '.claude'));
  let settings = {};
  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      settings = await fs.readJson(SETTINGS_PATH);
    } catch {
      settings = {};
    }
  }

  if (!Array.isArray(settings.enabledMcpjsonServers)) {
    settings.enabledMcpjsonServers = [];
  }

  if (!settings.enabledMcpjsonServers.includes('ruflo')) {
    settings.enabledMcpjsonServers.push('ruflo');
    await fs.writeJson(SETTINGS_PATH, settings, { spaces: 2 });
    result.settingsUpdated = true;
  }

  return result;
}
