'use strict';

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { mergeStateWithDefaults } from '../../scripts/state-schema.js';

export function registerUpgrade(program, deps) {
  const { print, PACKAGE_ROOT } = deps;

  program
    .command('upgrade')
    .description('Upgrade the /odd skills/commands, hooks/plugin, and odd-flow config to the latest version')
    .option('--agent <type>', 'Target agent: claude-code, opencode, codex, both, all, or auto (default: auto)', 'auto')
    .action(async (options) => {
      print.logo();
      const { default: detectAgent } = await import('../../scripts/detect-agent.js');
      const agent = detectAgent(options.agent);
      const isClaude = agent === 'claude-code' || agent === 'both' || agent === 'all';
      const isOpenCode = agent === 'opencode' || agent === 'both' || agent === 'all';
      const isCodex = agent === 'codex' || agent === 'all';
      const targetDir = process.cwd();
      const stateFile = path.resolve(targetDir, '.odd', 'state.json');

      if (!fs.existsSync(stateFile)) {
        print.err('No ODD project found in this directory.');
        print.info('Run ' + chalk.cyan('cd') + ' into an ODD project first.');
        process.exit(1);
      }

      console.log(chalk.bold('  Upgrading ODD Studio...\n'));
      if (isClaude) await upgradeClaude(PACKAGE_ROOT, targetDir);
      if (isOpenCode) await upgradeOpenCode(PACKAGE_ROOT, targetDir);
      if (isCodex) await upgradeCodex(PACKAGE_ROOT, targetDir);
      await upgradeMcp(agent, targetDir);
      await upgradeStateSchema(targetDir);
      print.blank();
      print.ok('Upgrade complete.');
      print.blank();
    });
}

async function upgradeClaude(packageRoot, targetDir) {
  await runSpinner('Updating /odd skill...', 'Claude Code skill updated', async () => {
    const { default: installSkill } = await import('../../scripts/install-skill.js');
    await installSkill(packageRoot, targetDir, { force: true });
  });

  await runSpinner('Updating excalidraw skill...', 'Excalidraw skill updated', async () => {
    const { default: installExcalidraw } = await import('../../scripts/install-excalidraw.js');
    await installExcalidraw(packageRoot, targetDir, { force: true });
  });

  await runSpinner('Updating hooks...', 'Claude Code hooks updated', async () => {
    const { default: setupHooks } = await import('../../scripts/setup-hooks.js');
    await setupHooks(packageRoot, targetDir, { force: true });
  });
}

async function upgradeOpenCode(packageRoot, targetDir) {
  await runSpinner('Updating OpenCode commands...', 'OpenCode commands updated', async () => {
    const { default: installCommands } = await import('../../scripts/install-commands.js');
    await installCommands(packageRoot, targetDir, { force: true });
  });

  await runSpinner('Updating OpenCode plugin...', 'OpenCode plugin updated', async () => {
    const { default: setupPlugin } = await import('../../scripts/setup-plugin.js');
    await setupPlugin(packageRoot, targetDir);
  });
}

async function upgradeCodex(packageRoot, targetDir) {
  await runSpinner('Updating Codex plugin...', 'Codex plugin updated', async () => {
    const { default: setupCodexPlugin } = await import('../../scripts/setup-codex-plugin.js');
    await setupCodexPlugin(packageRoot, targetDir);
  });
}

async function upgradeMcp(agent, targetDir) {
  await runSpinner('Checking odd-flow MCP configuration...', null, async (spinner) => {
    const { default: setupMcp } = await import('../../scripts/setup-mcp.js');
    const result = await setupMcp(agent, targetDir);
    spinner.succeed(result.mcpJsonUpdated || result.openCodeUpdated ? 'odd-flow MCP configured' : 'odd-flow MCP already configured');
  });
}

async function upgradeStateSchema(targetDir) {
  await runSpinner('Updating local ODD state schema...', 'ODD state schema updated', async () => {
    const stateFile = path.resolve(targetDir, '.odd', 'state.json');
    const state = mergeStateWithDefaults(await fs.readJson(stateFile));
    await fs.writeJson(stateFile, state, { spaces: 2 });
  });
}

async function runSpinner(text, successMessage, task) {
  const spinner = ora({ text, indent: 4 }).start();
  try {
    await task(spinner);
    if (successMessage) spinner.succeed(successMessage);
  } catch (error) {
    spinner.fail(text.replace('Updating', '').replace('Checking', '').trim() + ' failed: ' + error.message);
  }
}
