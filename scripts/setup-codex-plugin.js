'use strict';
import fs from 'fs-extra';
import path from 'path';
import {
  CODEX_MARKETPLACE_ROOT,
  CODEX_PLUGIN_NAME,
  ODD_HOOK_FILE,
} from './assets.js';
import installCodexCommands from './install-codex-commands.js';

const PLUGIN_RELATIVE_PATH = `./plugins/${CODEX_PLUGIN_NAME}`;
const MARKETPLACE_ENTRY = {
  name: CODEX_PLUGIN_NAME,
  source: {
    source: 'local',
    path: PLUGIN_RELATIVE_PATH,
  },
  policy: {
    installation: 'AVAILABLE',
    authentication: 'ON_INSTALL',
  },
  category: 'Coding',
};

export default async function setupCodexPlugin(packageRoot, targetDir) {
  const pluginSource = path.join(packageRoot, 'codex-plugin');
  const pluginDest = path.join(targetDir, 'plugins', CODEX_PLUGIN_NAME);
  const skillSource = path.join(packageRoot, 'skill');
  const hookSource = path.join(packageRoot, 'hooks', ODD_HOOK_FILE);

  if (!fs.existsSync(pluginSource)) {
    throw new Error(`Codex plugin source not found: ${pluginSource}`);
  }

  await fs.copy(pluginSource, pluginDest, { overwrite: true });
  await installCodexSkills(skillSource, pluginDest);
  await installCodexCommands(pluginDest);
  await installCodexHook(hookSource, pluginDest);
  const marketplaceUpdated = await updateMarketplace(targetDir);

  return { destination: pluginDest, marketplaceUpdated };
}

async function installCodexSkills(skillSource, pluginDest) {
  const skillsDest = path.join(pluginDest, 'skills');
  await fs.ensureDir(skillsDest);

  const oddDest = path.join(skillsDest, 'odd');
  await fs.ensureDir(oddDest);

  const entries = await fs.readdir(skillSource, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(skillSource, entry.name);
    if (entry.isDirectory() && fs.existsSync(path.join(src, 'SKILL.md'))) {
      await fs.copy(src, path.join(skillsDest, entry.name), { overwrite: true });
      await rewriteSkillPaths(path.join(skillsDest, entry.name, 'SKILL.md'));
      continue;
    }

    await fs.copy(src, path.join(oddDest, entry.name), { overwrite: true });
  }

  await rewriteSkillPaths(path.join(oddDest, 'SKILL.md'));
}

async function rewriteSkillPaths(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = await fs.readFile(filePath, 'utf8');
  content = content.replace(/Works with Claude Code and OpenCode\./g, 'Works with Claude Code, OpenCode, and Codex.');
  content = content.replace(/`\.claude\/skills\/odd\//g, '`plugins/odd-studio/skills/odd/');
  content = content.replace(/\.claude\/skills\/odd\//g, 'plugins/odd-studio/skills/odd/');
  await fs.writeFile(filePath, content);
}

async function installCodexHook(hookSource, pluginDest) {
  const hooksDest = path.join(pluginDest, 'hooks');
  await fs.ensureDir(hooksDest);
  const hookDest = path.join(hooksDest, ODD_HOOK_FILE);
  await fs.copy(hookSource, hookDest, { overwrite: true });
  await fs.chmod(hookDest, 0o755);
}

async function updateMarketplace(targetDir) {
  const marketplacePath = path.join(targetDir, '.agents', 'plugins', 'marketplace.json');
  await fs.ensureDir(path.dirname(marketplacePath));

  let marketplace = CODEX_MARKETPLACE_ROOT;
  if (fs.existsSync(marketplacePath)) {
    try {
      marketplace = await fs.readJson(marketplacePath);
    } catch {
      marketplace = CODEX_MARKETPLACE_ROOT;
    }
  }

  if (!marketplace.name) marketplace.name = CODEX_MARKETPLACE_ROOT.name;
  if (!marketplace.interface) marketplace.interface = CODEX_MARKETPLACE_ROOT.interface;
  if (!marketplace.interface.displayName) {
    marketplace.interface.displayName = CODEX_MARKETPLACE_ROOT.interface.displayName;
  }
  if (!Array.isArray(marketplace.plugins)) marketplace.plugins = [];

  const existingIndex = marketplace.plugins.findIndex((plugin) => plugin.name === CODEX_PLUGIN_NAME);
  if (existingIndex === -1) {
    marketplace.plugins.push(MARKETPLACE_ENTRY);
    await fs.writeJson(marketplacePath, marketplace, { spaces: 2 });
    return true;
  }

  const existing = marketplace.plugins[existingIndex];
  const changed = JSON.stringify(existing) !== JSON.stringify(MARKETPLACE_ENTRY);
  if (changed) {
    marketplace.plugins[existingIndex] = MARKETPLACE_ENTRY;
    await fs.writeJson(marketplacePath, marketplace, { spaces: 2 });
  }
  return changed;
}
