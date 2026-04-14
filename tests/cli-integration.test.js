import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const TMP = path.join(os.tmpdir(), 'odd-studio-test-cli');
const ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(ROOT, 'bin', 'odd-studio.js');

function runCli(args, cwd) {
  return execFileSync('node', [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

beforeEach(async () => {
  await fs.remove(TMP);
  await fs.ensureDir(TMP);
});

afterEach(async () => {
  await fs.remove(TMP);
});

describe('CLI integration', () => {
  it('initialises an OpenCode project with explicit odd-flow latest config and no git when requested', async () => {
    runCli(['init', 'cli-app', '--agent', 'opencode', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'cli-app');
    const openCodeConfig = await fs.readJson(path.join(projectDir, 'opencode.json'));

    expect(openCodeConfig.mcp['odd-flow'].command.join(' ')).toContain('odd-flow@latest');
    expect(fs.existsSync(path.join(projectDir, '.git'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'commands', 'odd.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'plugins', 'odd-studio-plugin.js'))).toBe(true);
  });

  it('initialises a Codex project with a local plugin and marketplace entry', async () => {
    runCli(['init', 'codex-app', '--agent', 'codex', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'codex-app');
    const marketplace = await fs.readJson(path.join(projectDir, '.agents', 'plugins', 'marketplace.json'));
    const pluginManifest = await fs.readJson(path.join(projectDir, 'plugins', 'odd-studio', '.codex-plugin', 'plugin.json'));
    const mcpConfig = await fs.readJson(path.join(projectDir, 'plugins', 'odd-studio', '.mcp.json'));

    expect(pluginManifest.name).toBe('odd-studio');
    expect(marketplace.plugins.some((plugin) => plugin.name === 'odd-studio')).toBe(true);
    expect(mcpConfig.mcpServers['odd-flow'].args.join(' ')).toContain('odd-flow@latest');
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', 'skills', 'odd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', 'commands', 'odd.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', 'commands', 'odd-build.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', 'commands', 'odd-debug.md'))).toBe(true);
  });

  it('initialises every supported agent when agent=all', async () => {
    runCli(['init', 'all-app', '--agent', 'all', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'all-app');
    expect(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'odd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'commands', 'odd.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'commands', 'odd-debug.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', '.codex-plugin', 'plugin.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', 'commands', 'odd.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio', 'commands', 'odd-debug.md'))).toBe(true);
  });

  it('status reports the local project state', async () => {
    runCli(['init', 'status-app', '--agent', 'claude-code', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'status-app');
    const output = runCli(['status'], projectDir);

    expect(output).toContain('Project:');
    expect(output).toContain('status-app');
    expect(output).toContain('Phase:');
  });

  it('uninstall removes only ODD-owned OpenCode assets', async () => {
    runCli(['init', 'cleanup-app', '--agent', 'opencode', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'cleanup-app');
    const customCommand = path.join(projectDir, '.opencode', 'commands', 'custom.md');
    const customPlugin = path.join(projectDir, '.opencode', 'plugins', 'custom.js');
    await fs.writeFile(customCommand, '# custom');
    await fs.writeFile(customPlugin, 'export default {}');

    runCli(['uninstall', '--agent', 'opencode'], projectDir);

    expect(fs.existsSync(customCommand)).toBe(true);
    expect(fs.existsSync(customPlugin)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'commands', 'odd.md'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'plugins', 'odd-studio-plugin.js'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.opencode', 'odd'))).toBe(false);
  });

  it('upgrade refreshes existing project-local assets without duplicating hook registrations', async () => {
    runCli(['init', 'upgrade-app', '--agent', 'claude-code', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'upgrade-app');
    const settingsPath = path.join(projectDir, '.claude', 'settings.local.json');
    const hookPath = path.join(projectDir, '.claude', 'hooks', 'odd-studio.sh');

    await fs.writeFile(hookPath, '# stale hook');
    runCli(['upgrade', '--agent', 'claude-code'], projectDir);

    const settings = await fs.readJson(settingsPath);
    const oddEntries = Object.values(settings.hooks)
      .flat()
      .filter((entry) => entry._oddStudio);
    const hookContent = await fs.readFile(hookPath, 'utf8');

    expect(oddEntries).toHaveLength(12);
    expect(hookContent).toContain('odd-studio.sh');
    expect(hookContent).not.toContain('# stale hook');
  });

  it('upgrade refreshes an existing Codex plugin and keeps a single marketplace entry', async () => {
    runCli(['init', 'codex-upgrade', '--agent', 'codex', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'codex-upgrade');
    const pluginPath = path.join(projectDir, 'plugins', 'odd-studio', 'README.md');
    const marketplacePath = path.join(projectDir, '.agents', 'plugins', 'marketplace.json');

    await fs.writeFile(pluginPath, 'stale plugin');
    runCli(['upgrade', '--agent', 'codex'], projectDir);

    const marketplace = await fs.readJson(marketplacePath);
    const pluginContent = await fs.readFile(pluginPath, 'utf8');
    expect(pluginContent).toContain('ODD Studio for Codex');
    expect(marketplace.plugins.filter((plugin) => plugin.name === 'odd-studio')).toHaveLength(1);
  });

  it('uninstall removes only ODD-owned Claude assets and preserves unrelated skills', async () => {
    runCli(['init', 'claude-cleanup', '--agent', 'claude-code', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'claude-cleanup');
    const customSkill = path.join(projectDir, '.claude', 'skills', 'custom', 'SKILL.md');
    const settingsPath = path.join(projectDir, '.claude', 'settings.local.json');
    const settings = await fs.readJson(settingsPath);
    settings.hooks.PreToolUse.push({ custom: true, hooks: [{ type: 'command', command: 'echo hi' }] });
    await fs.writeJson(settingsPath, settings, { spaces: 2 });
    await fs.ensureDir(path.dirname(customSkill));
    await fs.writeFile(customSkill, '# custom skill');

    runCli(['uninstall', '--agent', 'claude-code'], projectDir);

    const updatedSettings = await fs.readJson(settingsPath);
    expect(fs.existsSync(customSkill)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'odd'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'excalidraw'))).toBe(false);
    expect(fs.existsSync(path.join(projectDir, '.claude', 'hooks', 'odd-studio.sh'))).toBe(false);
    expect(updatedSettings.hooks.PreToolUse.some((entry) => entry.custom)).toBe(true);
    expect(Object.values(updatedSettings.hooks).flat().some((entry) => entry._oddStudio)).toBe(false);
  });

  it('uninstall removes only ODD-owned Codex assets and preserves unrelated marketplace entries', async () => {
    runCli(['init', 'codex-cleanup', '--agent', 'codex', '--yes', '--skip-git'], TMP);

    const projectDir = path.join(TMP, 'codex-cleanup');
    const otherPluginPath = path.join(projectDir, 'plugins', 'custom-tool', '.codex-plugin', 'plugin.json');
    const marketplacePath = path.join(projectDir, '.agents', 'plugins', 'marketplace.json');
    const marketplace = await fs.readJson(marketplacePath);

    marketplace.plugins.push({
      name: 'custom-tool',
      source: { source: 'local', path: './plugins/custom-tool' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Coding',
    });
    await fs.writeJson(marketplacePath, marketplace, { spaces: 2 });
    await fs.ensureDir(path.dirname(otherPluginPath));
    await fs.writeJson(otherPluginPath, { name: 'custom-tool' }, { spaces: 2 });

    runCli(['uninstall', '--agent', 'codex'], projectDir);

    const updatedMarketplace = await fs.readJson(marketplacePath);
    expect(fs.existsSync(path.join(projectDir, 'plugins', 'odd-studio'))).toBe(false);
    expect(fs.existsSync(otherPluginPath)).toBe(true);
    expect(updatedMarketplace.plugins.some((plugin) => plugin.name === 'odd-studio')).toBe(false);
    expect(updatedMarketplace.plugins.some((plugin) => plugin.name === 'custom-tool')).toBe(true);
  });
});
