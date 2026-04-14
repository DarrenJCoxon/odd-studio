'use strict';
import fs from 'fs-extra';
import path from 'path';

// Track the latest odd-flow release so installed projects pick up
// the current MCP server implementation from the same package owner.
const ODD_FLOW_PACKAGE_SPEC = 'odd-flow@latest';

const ODD_FLOW_SERVER_ENTRY = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', ODD_FLOW_PACKAGE_SPEC, 'mcp', 'start'],
  env: {},
};

/**
 * Configures the odd-flow MCP server in the project directory.
 *
 * For Claude Code:
 *   <projectDir>/.mcp.json — project-local MCP config (auto-read by Claude Code)
 *
 * For OpenCode:
 *   <projectDir>/opencode.json — project-local MCP config
 *
 * Nothing is written to ~/. Both paths are idempotent.
 *
 * @param {'claude-code' | 'opencode' | 'codex' | 'both' | 'all'} agent - Target agent
 * @param {string} targetDir - Project directory
 */
export default async function setupMcp(agent = 'claude-code', targetDir) {
  const result = { mcpJsonUpdated: false, openCodeUpdated: false, codexUpdated: false };

  // ── Claude Code: <projectDir>/.mcp.json ───────────────────────────────────
  if (agent === 'claude-code' || agent === 'both' || agent === 'all') {
    const mcpJsonPath = path.join(targetDir, '.mcp.json');
    let mcpConfig = { mcpServers: {} };
    if (fs.existsSync(mcpJsonPath)) {
      try {
        mcpConfig = await fs.readJson(mcpJsonPath);
      } catch {
        mcpConfig = { mcpServers: {} };
      }
    }
    if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};

    if (!mcpConfig.mcpServers['odd-flow']) {
      // Backup existing config before modifying
      if (fs.existsSync(mcpJsonPath)) {
        await fs.copy(mcpJsonPath, mcpJsonPath + '.bak', { overwrite: true });
      }
      mcpConfig.mcpServers['odd-flow'] = ODD_FLOW_SERVER_ENTRY;
      await fs.writeJson(mcpJsonPath, mcpConfig, { spaces: 2 });
      result.mcpJsonUpdated = true;
    }
  }

  // ── OpenCode: <projectDir>/opencode.json ──────────────────────────────────
  if (agent === 'opencode' || agent === 'both' || agent === 'all') {
    const ocConfigPath = path.join(targetDir, 'opencode.json');

    let ocConfig = {};
    if (fs.existsSync(ocConfigPath)) {
      try {
        ocConfig = await fs.readJson(ocConfigPath);
      } catch {
        ocConfig = {};
      }
    }

    if (!ocConfig.mcp) ocConfig.mcp = {};

    if (!ocConfig.mcp['odd-flow']) {
      // Backup existing config before modifying
      if (fs.existsSync(ocConfigPath)) {
        await fs.copy(ocConfigPath, ocConfigPath + '.bak', { overwrite: true });
      }
      ocConfig.mcp['odd-flow'] = {
        type: 'local',
        command: ['npx', '-y', ODD_FLOW_PACKAGE_SPEC, 'mcp', 'start'],
        enabled: true,
      };
      await fs.writeJson(ocConfigPath, ocConfig, { spaces: 2 });
      result.openCodeUpdated = true;
    }
  }

  if (agent === 'codex' || agent === 'all') {
    const codexMcpPath = path.join(targetDir, 'plugins', 'odd-studio', '.mcp.json');
    await fs.ensureDir(path.dirname(codexMcpPath));
    let codexConfig = { mcpServers: {} };
    if (fs.existsSync(codexMcpPath)) {
      try {
        codexConfig = await fs.readJson(codexMcpPath);
      } catch {
        codexConfig = { mcpServers: {} };
      }
    }
    if (!codexConfig.mcpServers) codexConfig.mcpServers = {};

    if (!codexConfig.mcpServers['odd-flow']) {
      if (fs.existsSync(codexMcpPath)) {
        await fs.copy(codexMcpPath, codexMcpPath + '.bak', { overwrite: true });
      }
      codexConfig.mcpServers['odd-flow'] = ODD_FLOW_SERVER_ENTRY;
      await fs.writeJson(codexMcpPath, codexConfig, { spaces: 2 });
      result.codexUpdated = true;
    }
  }

  return result;
}
