'use strict';

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

export function registerInit(program, deps) {
  const { print, PACKAGE_ROOT } = deps;

  program
    .command('init [project-name]')
    .description('Scaffold a new ODD project and install /odd into your AI coding agent')
    .option('--agent <type>', 'Target agent: claude-code, opencode, codex, both, all, or auto (default: auto)', 'auto')
    .option('--skip-skill', 'Skip installing the /odd skills/commands globally (advanced)')
    .option('--skip-hooks', 'Skip installing safety hooks/plugin (not recommended)')
    .option('--skip-mcp', 'Skip configuring the odd-flow MCP server')
    .option('--skip-git', 'Skip git initialisation and the initial scaffold commit')
    .option('--yes', 'Accept all defaults without prompting')
    .action(async (projectName, options) => {
      print.logo();

      const { default: detectAgent } = await import('../../scripts/detect-agent.js');
      const { default: scaffoldProject } = await import('../../scripts/scaffold-project.js');

      const agent = detectAgent(options.agent);
      const isClaude = agent === 'claude-code' || agent === 'both' || agent === 'all';
      const isOpenCode = agent === 'opencode' || agent === 'both' || agent === 'all';
      const isCodex = agent === 'codex' || agent === 'all';
      const targetDir = projectName ? path.resolve(process.cwd(), projectName) : process.cwd();
      const resolvedName = projectName || path.basename(process.cwd());
      const agentLabel = getAgentLabel(agent);
      const totalSteps = 5;

      console.log(chalk.bold(`  Setting up: ${chalk.cyan(resolvedName)}`) + chalk.dim(` (${agentLabel})\n`));

      const scaffoldSpinner = ora({ text: '', indent: 4 }).start();
      print.step(1, totalSteps, 'Creating project structure...');
      try {
        await scaffoldProject(targetDir, resolvedName, agent, { skipGit: options.skipGit });
        scaffoldSpinner.stop();
        print.ok('Project scaffolded at ' + chalk.cyan(targetDir));
      } catch (error) {
        scaffoldSpinner.stop();
        print.err('Failed to scaffold project: ' + error.message);
        process.exit(1);
      }

      await installSkills({ PACKAGE_ROOT, isClaude, isOpenCode, options, print, targetDir, totalSteps });
      await installHooks({ PACKAGE_ROOT, isClaude, isOpenCode, isCodex, options, print, targetDir, totalSteps });
      await maybeInstallCheckpoint({ options, print, targetDir, totalSteps });
      await configureMcp({ agent, options, print, targetDir, totalSteps });

      print.blank();
      console.log(chalk.bold.green('  ✓ ODD Studio is ready.\n'));
      printNextSteps({ isClaude, isOpenCode, isCodex, projectName });
      console.log(chalk.dim('  ODD Studio implements Outcome-Driven Development.'));
      console.log(chalk.dim("  At every step, you'll understand why — not just what to do."));
      print.blank();
    });
}

async function installSkills(context) {
  const { PACKAGE_ROOT, isClaude, isOpenCode, options, print, targetDir, totalSteps } = context;

  if (options.skipSkill) {
    print.step(2, totalSteps, 'Skipping skill/command install (--skip-skill)');
    print.warn('Remember to install manually for /odd to work.');
    return;
  }

  const targets = [];
  if (isClaude) targets.push('Claude Code skills');
  if (isOpenCode) targets.push('OpenCode commands');
  print.step(2, totalSteps, `Installing /odd into ${targets.join(' + ')}...`);
  const spinner = ora({ text: '', indent: 4 }).start();

  try {
    const installs = [];
    if (isClaude) {
      const { default: installSkill } = await import('../../scripts/install-skill.js');
      const { default: installExcalidraw } = await import('../../scripts/install-excalidraw.js');
      installs.push(installSkill(PACKAGE_ROOT, targetDir), installExcalidraw(PACKAGE_ROOT, targetDir));
    }
    if (isOpenCode) {
      const { default: installCommands } = await import('../../scripts/install-commands.js');
      installs.push(installCommands(PACKAGE_ROOT, targetDir));
    }
    await Promise.all(installs);
    spinner.stop();
    if (isClaude) {
      print.ok('/odd skill installed → ' + chalk.cyan('.claude/skills/odd/'));
      print.ok('excalidraw skill installed → ' + chalk.cyan('.claude/skills/excalidraw/'));
    }
    if (isOpenCode) print.ok('/odd commands installed → ' + chalk.cyan('.opencode/commands/'));
  } catch (error) {
    spinner.stop();
    print.warn('Could not install skills/commands automatically: ' + error.message);
  }
}

async function installHooks(context) {
  const { PACKAGE_ROOT, isClaude, isOpenCode, isCodex, options, print, targetDir, totalSteps } = context;

  if (options.skipHooks) {
    print.step(3, totalSteps, 'Skipping hooks/plugin (--skip-hooks)');
    print.warn('Safety gates not installed. Quality enforcement will not run.');
    return;
  }

  const targets = [];
  if (isClaude) targets.push('hooks');
  if (isOpenCode) targets.push('plugin');
  if (isCodex) targets.push('Codex plugin');
  print.step(3, totalSteps, `Installing safety ${targets.join(' + ')}...`);
  const spinner = ora({ text: '', indent: 4 }).start();

  try {
    const installs = [];
    if (isClaude) {
      const { default: setupHooks } = await import('../../scripts/setup-hooks.js');
      installs.push(setupHooks(PACKAGE_ROOT, targetDir).then((result) => {
        print.ok('Claude Code hooks → ' + result.hookCount + ' hooks active');
      }));
    }
    if (isOpenCode) {
      const { default: setupPlugin } = await import('../../scripts/setup-plugin.js');
      installs.push(setupPlugin(PACKAGE_ROOT, targetDir).then(() => {
        print.ok('OpenCode plugin installed → odd-studio-plugin.js');
      }));
    }
    if (isCodex) {
      const { default: setupCodexPlugin } = await import('../../scripts/setup-codex-plugin.js');
      installs.push(setupCodexPlugin(PACKAGE_ROOT, targetDir).then(() => {
        print.ok('Codex plugin installed → ' + chalk.cyan('plugins/odd-studio/'));
      }));
    }
    await Promise.all(installs);
    spinner.stop();
  } catch (error) {
    spinner.stop();
    print.warn('Could not install hooks/plugin automatically: ' + error.message);
  }
}

async function maybeInstallCheckpoint({ options, print, targetDir, totalSteps }) {
  let installCheckpoint = false;
  if (!options.yes) {
    const { default: inquirer } = await import('inquirer');
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'checkpoint',
      message: 'Install Checkpoint security scanning into this project?',
      default: false,
    }]);
    installCheckpoint = answer.checkpoint;
  }

  if (!installCheckpoint) {
    print.step(4, totalSteps, 'Skipping Checkpoint security scanning');
    print.info('Enable later: npx @darrenjcoxon/vibeguard --install-tools');
    return;
  }

  print.step(4, totalSteps, 'Installing Checkpoint security scanning...');
  const spinner = ora({ text: '', indent: 4 }).start();
  try {
    const { execFileSync } = await import('child_process');
    execFileSync('npx', ['-y', '@darrenjcoxon/vibeguard', '--install-tools'], {
      cwd: targetDir,
      stdio: 'inherit',
      timeout: 60000,
    });
    spinner.stop();
    print.ok('Checkpoint security tools installed');
  } catch {
    spinner.stop();
    print.warn('Checkpoint tools could not be installed');
    print.info('Run: npx @darrenjcoxon/vibeguard --install-tools  to enable later');
  }
}

async function configureMcp({ agent, options, print, targetDir, totalSteps }) {
  if (options.skipMcp) {
    print.step(5, totalSteps, 'Skipping odd-flow MCP server (--skip-mcp)');
    print.info('odd-flow swarm coordination will not be available.');
    return;
  }

  print.step(5, totalSteps, 'Configuring odd-flow memory server...');
  const spinner = ora({ text: '', indent: 4 }).start();
  try {
    const { default: setupMcp } = await import('../../scripts/setup-mcp.js');
    const result = await setupMcp(agent, targetDir);
    spinner.stop();
    if (result.mcpJsonUpdated || result.openCodeUpdated || result.codexUpdated) {
      print.ok('odd-flow MCP server configured → ' + chalk.cyan('.mcp.json'));
    } else {
      print.ok('odd-flow MCP server already configured');
    }
  } catch (error) {
    spinner.stop();
    print.warn('Could not configure odd-flow automatically: ' + error.message);
  }
}

function printNextSteps({ isClaude, isOpenCode, isCodex, projectName }) {
  console.log(chalk.bold('  Next steps:'));
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  let stepN = 1;
  if (projectName) console.log(`  ${stepN++}. ` + chalk.cyan(`cd ${projectName}`));
  if (isClaude) {
    console.log(`  ${stepN++}. Restart Claude Code: ` + chalk.cyan('quit and reopen') + chalk.dim(' (activates odd-flow memory + hooks)'));
    console.log(`  ${stepN++}. Open your project: ` + chalk.cyan('claude .'));
  }
  if (isOpenCode) {
    console.log(`  ${stepN++}. Restart OpenCode: ` + chalk.cyan('quit and reopen') + chalk.dim(' (activates odd-flow memory + plugin)'));
    console.log(`  ${stepN++}. Open your project: ` + chalk.cyan('opencode'));
  }
  if (isCodex) {
    console.log(`  ${stepN++}. Open your project in Codex`);
    console.log(`  ${stepN++}. Start ODD in Codex: ` + chalk.cyan('use ODD') + chalk.dim(' (or say ODD status to inspect state first)'));
  }
  if (isClaude || isOpenCode) {
    console.log(`  ${stepN++}. Start your ODD session: ` + chalk.cyan('/odd'));
  }
  console.log();
}

function getAgentLabel(agent) {
  if (agent === 'all') return 'Claude Code + OpenCode + Codex';
  if (agent === 'both') return 'Claude Code + OpenCode';
  if (agent === 'opencode') return 'OpenCode';
  if (agent === 'codex') return 'Codex';
  return 'Claude Code';
}
