import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import installCodexCommands from '../scripts/install-codex-commands.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN_ROOT = path.join(ROOT, 'codex-plugin');
const MANIFEST_PATH = path.join(PLUGIN_ROOT, '.codex-plugin', 'plugin.json');
const HOOKS_PATH = path.join(PLUGIN_ROOT, 'hooks.json');
const MCP_PATH = path.join(PLUGIN_ROOT, '.mcp.json');
const COMMANDS_PATH = path.join(ROOT, 'scripts', 'install-codex-commands.js');
const AGENTS_PATH = path.join(ROOT, 'templates', 'AGENTS.md');
const ODD_SKILL_PATH = path.join(ROOT, 'skill', 'SKILL.md');
const PERSONA_ARCHITECT_PATH = path.join(ROOT, 'skill', 'docs', 'planning', 'persona-architect.md');
const TMP = path.join(os.tmpdir(), 'odd-studio-test-codex-commands');

describe('Codex plugin assets', () => {
  it('ships the required Codex plugin files', async () => {
    for (const filePath of [MANIFEST_PATH, HOOKS_PATH, MCP_PATH, COMMANDS_PATH]) {
      expect(await fs.pathExists(filePath)).toBe(true);
    }
  });

  it('declares skills, hooks, and MCP wiring in the manifest', async () => {
    const manifest = await fs.readJson(MANIFEST_PATH);
    expect(manifest.name).toBe('odd-studio');
    expect(manifest.skills).toBe('./skills/');
    expect(manifest.hooks).toBe('./hooks.json');
    expect(manifest.mcpServers).toBe('./.mcp.json');
  });

  it('declares the expected safety gate commands in hooks.json', async () => {
    const hooks = await fs.readJson(HOOKS_PATH);
    const commands = JSON.stringify(hooks);
    expect(commands).toContain('brief-gate');
    expect(commands).toContain('build-gate');
    expect(commands).toContain('swarm-write');
    expect(commands).toContain('verify-gate');
    expect(commands).toContain('confirm-gate');
    expect(commands).toContain('checkpoint-gate');
    expect(commands).toContain('checkpoint-validate');
    expect(commands).toContain('security-quality');
    expect(commands).toContain('commit-gate');
    expect(commands).toContain('session-save');
  });

  it('pins the odd-flow MCP server to @latest', async () => {
    const config = await fs.readJson(MCP_PATH);
    expect(config.mcpServers['odd-flow'].args.join(' ')).toContain('odd-flow@latest');
  });

  it('Codex command installer generates a visible namespaced entrypoint', async () => {
    const content = await fs.readFile(COMMANDS_PATH, 'utf8');
    expect(content).toContain("path.join(pluginDest, 'commands')");
    expect(content).toContain('const CODEX_ODD_ROOT = `plugins/${CODEX_PLUGIN_NAME}/skills/odd/`;');
    expect(content).toContain('const CODEX_COMMAND_PREFIX = `/${CODEX_PLUGIN_NAME}:`;');
    expect(content).toContain('# ${CODEX_COMMAND_PREFIX}${cmd.name}');
    expect(content).toContain('${CODEX_ODD_ROOT}SKILL.md');
  });

  it('generates Codex subcommands that point at the Codex-local ODD skill tree', async () => {
    await fs.remove(TMP);
    await fs.ensureDir(TMP);

    await installCodexCommands(TMP);

    const buildCommand = await fs.readFile(path.join(TMP, 'commands', 'odd-build.md'), 'utf8');
    const debugCommand = await fs.readFile(path.join(TMP, 'commands', 'odd-debug.md'), 'utf8');
    expect(buildCommand).toContain('# /odd-studio:odd-build');
    expect(buildCommand).toContain('plugins/odd-studio/skills/odd/SKILL.md');
    expect(buildCommand).toContain('plugins/odd-studio/skills/odd/docs/build/build-protocol.md');
    expect(buildCommand).toContain('`*build`');
    expect(debugCommand).toContain('# /odd-studio:odd-debug');
    expect(debugCommand).toContain('plugins/odd-studio/skills/odd/docs/build/debug-protocol.md');
    expect(debugCommand).toContain('`*debug`');
    expect(debugCommand).toContain('`ui-behaviour`');
    expect(debugCommand).toContain('`full-stack`');
    expect(debugCommand).toContain('Do not guess.');

    await fs.remove(TMP);
  });

  it('publishes the Codex asset tree in package.json', async () => {
    const pkg = await fs.readJson(path.join(ROOT, 'package.json'));
    expect(pkg.files).toContain('codex-plugin/');
  });

  it('documents the full fresh-project Codex startup flow in AGENTS', async () => {
    const content = await fs.readFile(AGENTS_PATH, 'utf8');
    expect(content).toContain('use ODD');
    expect(content).toContain('ODD status');
    expect(content).toContain('Display the full ODD Studio welcome message from the skill before asking any planning questions');
    expect(content).toContain('What is this thing?');
    expect(content).toContain('Who are the people involved?');
    expect(content).toContain('Who has it hardest?');
    expect(content).toContain('summarise what they want to build before asking for the first persona name');
  });

  it('prompts Diana to capture product context before naming the first persona', async () => {
    const content = await fs.readFile(PERSONA_ARCHITECT_PATH, 'utf8');
    expect(content).toContain('Before we start building personas, I need to understand what you are making.');
    expect(content).toContain('What is this thing? Not the technology — the purpose.');
    expect(content).toContain('Who are the people involved?');
    expect(content).toContain('Who has it hardest?');
    expect(content).toContain('summarise the product, the people involved, and the likely acid-test persona');
  });

  it('adds Codex skill-discovery metadata for natural-language ODD startup prompts', async () => {
    const content = await fs.readFile(ODD_SKILL_PATH, 'utf8');
    expect(content).toContain('promptSignals:');
    expect(content).toContain('use odd');
    expect(content).toContain('start odd');
    expect(content).toContain('odd status');
    expect(content).toContain('odd debug');
    expect(content).toContain('retrieval:');
    expect(content).toContain('odd studio');
  });
});
