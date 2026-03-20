#!/usr/bin/env node
'use strict';

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

// ─── Visual helpers ──────────────────────────────────────────────────────────

const print = {
  logo: () => {
    console.log(chalk.bold.cyan('\n  🎯 ODD Studio'));
    console.log(chalk.dim('  Outcome-Driven Development for Claude Code\n'));
  },
  step: (n, total, msg) => console.log(chalk.dim(`  [${n}/${total}]`) + ' ' + msg),
  ok: (msg) => console.log(chalk.green('  ✓ ') + msg),
  warn: (msg) => console.log(chalk.yellow('  ⚠ ') + msg),
  err: (msg) => console.log(chalk.red('  ✗ ') + msg),
  info: (msg) => console.log(chalk.dim('  → ') + msg),
  blank: () => console.log(),
};

// ─── CLI definition ───────────────────────────────────────────────────────────

program
  .name('odd-studio')
  .description('Outcome-Driven Development harness for Claude Code')
  .version(pkg.version);

// ── init ──────────────────────────────────────────────────────────────────────
program
  .command('init [project-name]')
  .description('Scaffold a new ODD project and install the /odd skill into Claude Code')
  .option('--skip-skill', 'Skip installing the /odd skill globally (advanced)')
  .option('--skip-hooks', 'Skip installing safety hooks (not recommended)')
  .option('--yes', 'Accept all defaults without prompting')
  .action(async (projectName, options) => {
    print.logo();

    const { default: installSkill } = await import('../scripts/install-skill.js');
    const { default: setupHooks } = await import('../scripts/setup-hooks.js');
    const { default: scaffoldProject } = await import('../scripts/scaffold-project.js');

    // Resolve project directory
    const targetDir = projectName
      ? path.resolve(process.cwd(), projectName)
      : process.cwd();

    const resolvedName = projectName || path.basename(process.cwd());

    console.log(chalk.bold(`  Setting up: ${chalk.cyan(resolvedName)}\n`));

    // 1. Scaffold project structure
    print.step(1, 5, 'Creating project structure...');
    const spinner1 = ora({ text: '', indent: 4 }).start();
    try {
      await scaffoldProject(targetDir, resolvedName);
      spinner1.stop();
      print.ok('Project scaffolded at ' + chalk.cyan(targetDir));
    } catch (e) {
      spinner1.stop();
      print.err('Failed to scaffold project: ' + e.message);
      process.exit(1);
    }

    // 2. Install /odd skill
    if (!options.skipSkill) {
      print.step(2, 5, 'Installing /odd skill into Claude Code...');
      const spinner2 = ora({ text: '', indent: 4 }).start();
      try {
        const result = await installSkill(PACKAGE_ROOT);
        spinner2.stop();
        print.ok('Skill installed → ' + chalk.cyan(result.destination));
      } catch (e) {
        spinner2.stop();
        print.warn('Could not install skill automatically: ' + e.message);
        print.info('Manual install: copy ' + chalk.dim('skill/') + ' to ' + chalk.dim('~/.claude/skills/odd/'));
      }
    } else {
      print.step(2, 5, 'Skipping skill install (--skip-skill)');
      print.warn('Remember to install the skill manually for /odd to work in Claude Code.');
    }

    // 3. Setup hooks
    if (!options.skipHooks) {
      print.step(3, 5, 'Installing safety hooks into Claude Code settings...');
      const spinner3 = ora({ text: '', indent: 4 }).start();
      try {
        const result = await setupHooks(PACKAGE_ROOT);
        spinner3.stop();
        print.ok('Hooks installed → ' + result.hookCount + ' hooks active');
      } catch (e) {
        spinner3.stop();
        print.warn('Could not install hooks automatically: ' + e.message);
        print.info('Manual install: add entries from ' + chalk.dim('hooks/') + ' to ~/.claude/settings.json');
      }
    } else {
      print.step(3, 5, 'Skipping hooks (--skip-hooks)');
      print.warn('Safety hooks not installed. Git guardrails and quality gates will not run.');
    }

    // 4. Install Checkpoint security scanning tools
    print.step(4, 5, 'Installing Checkpoint security scanning tools...');
    const spinner4a = ora({ text: '', indent: 4 }).start();
    try {
      const { execSync } = await import('child_process');
      execSync('npx @darrenjcoxon/vibeguard --install-tools --quiet 2>/dev/null', { stdio: 'ignore', timeout: 60000 });
      spinner4a.stop();
      print.ok('Checkpoint security tools installed');
    } catch (e) {
      spinner4a.stop();
      print.warn('Checkpoint tools could not be installed automatically');
      print.info('Run: npx @darrenjcoxon/vibeguard --install-tools  to enable security scanning');
    }

    // 5. Configure ruflo MCP server (cross-session memory)
    print.step(5, 5, 'Configuring ruflo memory server...');
    const spinner5 = ora({ text: '', indent: 4 }).start();
    try {
      const { default: setupMcp } = await import('../scripts/setup-mcp.js');
      const mcpResult = await setupMcp();
      spinner5.stop();
      if (mcpResult.mcpJsonUpdated || mcpResult.settingsUpdated) {
        print.ok('Ruflo MCP server configured — cross-session memory enabled');
      } else {
        print.ok('Ruflo MCP server already configured');
      }
    } catch (e) {
      spinner5.stop();
      print.warn('Could not configure ruflo automatically: ' + e.message);
      print.info('Manual setup: add ruflo to ~/.mcp.json and enable in ~/.claude/settings.json');
      print.info('See: https://github.com/ruvnet/ruflo for installation instructions');
    }

    // ── Done ──
    print.blank();
    console.log(chalk.bold.green('  ✓ ODD Studio is ready.\n'));

    console.log(chalk.bold('  Next steps:'));
    console.log(chalk.dim('  ─────────────────────────────────────────'));
    if (projectName) {
      console.log('  1. ' + chalk.cyan(`cd ${projectName}`));
    }
    console.log('  ' + (projectName ? '2' : '1') + '. Restart Claude Code: ' + chalk.cyan('quit and reopen') + chalk.dim(' (activates ruflo memory + hooks)'));
    console.log('  ' + (projectName ? '3' : '2') + '. Open your project: ' + chalk.cyan('claude .'));
    console.log('  ' + (projectName ? '4' : '3') + '. Start your ODD session: ' + chalk.cyan('/odd'));
    print.blank();

    console.log(chalk.dim('  ODD Studio implements Outcome-Driven Development.'));
    console.log(chalk.dim('  At every step, you\'ll understand why — not just what to do.'));
    print.blank();
  });

// ── status ────────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show the ODD planning status for the current project')
  .action(async () => {
    print.logo();
    const stateFile = path.resolve(process.cwd(), '.odd', 'state.json');
    if (!fs.existsSync(stateFile)) {
      print.warn('No ODD state found in this directory.');
      print.info('Run ' + chalk.cyan('odd-studio init') + ' to initialise a project, or ' + chalk.cyan('cd') + ' into an existing ODD project.');
      process.exit(0);
    }
    const state = await fs.readJson(stateFile);
    console.log(chalk.bold('  Project: ') + chalk.cyan(state.projectName || 'unnamed'));
    console.log(chalk.bold('  Phase:   ') + (state.currentPhase || 'Not started'));
    console.log(chalk.bold('  Step:    ') + (state.currentStep || 'Not started'));
    print.blank();
    if (state.personas?.length) {
      console.log(chalk.bold('  Personas (' + state.personas.length + '):'));
      state.personas.forEach(p => console.log('    ' + chalk.green('✓ ') + p));
    }
    if (state.outcomes?.length) {
      console.log(chalk.bold('  Outcomes (' + state.outcomes.length + '):'));
      state.outcomes.forEach(o => {
        const icon = o.status === 'verified' ? chalk.green('✓') : o.status === 'reviewed' ? chalk.yellow('◑') : chalk.dim('○');
        console.log('    ' + icon + ' ' + o.name + chalk.dim(' [' + (o.status || 'draft') + ']'));
      });
    }
    print.blank();
    console.log(chalk.dim('  Open Claude Code and type /odd to resume.'));
    print.blank();
  });

// ── upgrade ───────────────────────────────────────────────────────────────────
program
  .command('upgrade')
  .description('Upgrade the /odd skill and hooks to the latest version')
  .action(async () => {
    print.logo();
    const { default: installSkill } = await import('../scripts/install-skill.js');
    const { default: setupHooks } = await import('../scripts/setup-hooks.js');

    console.log(chalk.bold('  Upgrading ODD Studio...\n'));

    const s1 = ora({ text: 'Updating /odd skill...', indent: 4 }).start();
    try {
      await installSkill(PACKAGE_ROOT, { force: true });
      s1.succeed('Skill updated');
    } catch (e) {
      s1.fail('Skill update failed: ' + e.message);
    }

    const s2 = ora({ text: 'Updating hooks...', indent: 4 }).start();
    try {
      await setupHooks(PACKAGE_ROOT, { force: true });
      s2.succeed('Hooks updated');
    } catch (e) {
      s2.fail('Hooks update failed: ' + e.message);
    }

    const s3 = ora({ text: 'Checking ruflo MCP configuration...', indent: 4 }).start();
    try {
      const { default: setupMcp } = await import('../scripts/setup-mcp.js');
      const mcpResult = await setupMcp();
      s3.succeed(mcpResult.mcpJsonUpdated || mcpResult.settingsUpdated ? 'Ruflo MCP configured' : 'Ruflo MCP already configured');
    } catch (e) {
      s3.fail('Ruflo MCP check failed: ' + e.message);
    }

    print.blank();
    print.ok('Upgrade complete.');
    print.blank();
  });

// ── export ────────────────────────────────────────────────────────────────────
program
  .command('export')
  .description('Export the IDE Session Brief from current project state')
  .action(async () => {
    print.logo();
    const stateFile = path.resolve(process.cwd(), '.odd', 'state.json');
    if (!fs.existsSync(stateFile)) {
      print.err('No ODD state found. Run odd-studio init first.');
      process.exit(1);
    }
    print.info('Open Claude Code and run: ' + chalk.cyan('/odd') + ' then ' + chalk.cyan('*export'));
    print.info('The Session Brief will be saved to ' + chalk.cyan('docs/session-brief.md'));
    print.blank();
  });

program.parse();
