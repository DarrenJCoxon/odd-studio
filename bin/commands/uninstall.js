'use strict';

import path from 'path';
import fs from 'fs-extra';
import { CODEX_PLUGIN_NAME, OPEN_CODE_COMMAND_FILES } from '../../scripts/assets.js';
import { removeIfEmpty } from '../shared.js';

export function registerUninstall(program, deps) {
  const { print } = deps;

  program
    .command('uninstall')
    .description('Remove all ODD Studio hooks, skills, commands, plugin, and MCP config from this project')
    .option('--agent <type>', 'Target agent: claude-code, opencode, codex, both, all, or auto (default: auto)', 'auto')
    .action(async (options) => {
      print.logo();
      const { default: detectAgent } = await import('../../scripts/detect-agent.js');
      const agent = detectAgent(options.agent);
      const isClaude = agent === 'claude-code' || agent === 'both' || agent === 'all';
      const isOpenCode = agent === 'opencode' || agent === 'both' || agent === 'all';
      const isCodex = agent === 'codex' || agent === 'all';
      const targetDir = process.cwd();
      const removals = [];

      console.log('  Removing ODD Studio from this project...\n');
      if (isClaude) await removeClaudeAssets(targetDir, removals);
      if (isOpenCode) await removeOpenCodeAssets(targetDir, removals);
      if (isCodex) await removeCodexAssets(targetDir, removals);
      await removeMcpConfig(targetDir, removals);

      print.blank();
      if (removals.length > 0) removals.forEach((removal) => print.ok('Removed: ' + removal));
      else print.info('Nothing to remove — no ODD Studio artifacts found.');
      print.blank();
      print.info('Project files (docs/, .odd/state.json) were not removed.');
      print.info('Delete them manually if you no longer need them.');
      print.blank();
    });
}

async function removeClaudeAssets(targetDir, removals) {
  const settingsPath = path.join(targetDir, '.claude', 'settings.local.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = await fs.readJson(settingsPath);
      if (settings.hooks) {
        for (const event of Object.keys(settings.hooks)) {
          if (Array.isArray(settings.hooks[event])) {
            settings.hooks[event] = settings.hooks[event].filter((entry) => !entry._oddStudio);
          }
        }
        await fs.writeJson(settingsPath, settings, { spaces: 2 });
        removals.push('Claude Code hook registrations');
      }
    } catch {}
  }

  await removeOwnedPath(path.join(targetDir, '.claude', 'hooks', 'odd-studio.sh'), 'odd-studio.sh hook script', removals);
  await removeOwnedPath(path.join(targetDir, '.claude', 'skills', 'odd'), 'Claude Code /odd skill', removals);
  await removeOwnedPath(path.join(targetDir, '.claude', 'skills', 'excalidraw'), 'Claude Code excalidraw skill', removals);
}

async function removeOpenCodeAssets(targetDir, removals) {
  const commandsDir = path.join(targetDir, '.opencode', 'commands');
  let removedCommands = 0;
  for (const file of OPEN_CODE_COMMAND_FILES) {
    const filePath = path.join(commandsDir, file);
    if (fs.existsSync(filePath)) {
      await fs.remove(filePath);
      removedCommands += 1;
    }
  }

  if (removedCommands > 0) {
    removals.push('OpenCode ODD commands');
    await removeIfEmpty(commandsDir);
  }

  await removeOwnedPath(path.join(targetDir, '.opencode', 'odd'), 'OpenCode skill knowledge', removals);
  await removeOwnedPath(path.join(targetDir, '.opencode', 'plugins', 'odd-studio-plugin.js'), 'OpenCode ODD plugin', removals);
  await removeIfEmpty(path.join(targetDir, '.opencode', 'plugins'));
}

async function removeMcpConfig(targetDir, removals) {
  await removeMcpEntry(path.join(targetDir, '.mcp.json'), ['mcpServers', 'odd-flow'], 'odd-flow MCP server from .mcp.json', removals);
  await removeMcpEntry(path.join(targetDir, 'opencode.json'), ['mcp', 'odd-flow'], 'odd-flow MCP server from opencode.json', removals);
}

async function removeCodexAssets(targetDir, removals) {
  await removeOwnedPath(path.join(targetDir, 'plugins', CODEX_PLUGIN_NAME), 'Codex ODD plugin', removals);
  const marketplacePath = path.join(targetDir, '.agents', 'plugins', 'marketplace.json');
  if (!fs.existsSync(marketplacePath)) return;

  try {
    const marketplace = await fs.readJson(marketplacePath);
    if (!Array.isArray(marketplace.plugins)) return;
    const nextPlugins = marketplace.plugins.filter((plugin) => plugin.name !== CODEX_PLUGIN_NAME);
    if (nextPlugins.length === marketplace.plugins.length) return;
    marketplace.plugins = nextPlugins;
    await fs.writeJson(marketplacePath, marketplace, { spaces: 2 });
    removals.push('Codex marketplace registration');
  } catch {}
}

async function removeMcpEntry(filePath, keyPath, label, removals) {
  if (!fs.existsSync(filePath)) return;
  try {
    const config = await fs.readJson(filePath);
    const [rootKey, childKey] = keyPath;
    if (config[rootKey]?.[childKey]) {
      delete config[rootKey][childKey];
      await fs.writeJson(filePath, config, { spaces: 2 });
      removals.push(label);
    }
  } catch {}
}

async function removeOwnedPath(filePath, label, removals) {
  if (!fs.existsSync(filePath)) return;
  await fs.remove(filePath);
  removals.push(label);
}
