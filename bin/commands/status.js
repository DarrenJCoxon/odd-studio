'use strict';

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export function registerStatus(program, deps) {
  const { print } = deps;

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
      console.log(chalk.bold('  Mode:    ') + (state.buildMode || 'idle'));
      console.log(chalk.bold('  Step:    ') + (state.currentStep || 'Not started'));
      if (state.buildMode === 'debug') {
        console.log(chalk.bold('  Debug:   ') + (state.debugStrategy || 'strategy not set'));
        console.log(chalk.bold('  Target:  ') + (state.debugTarget || 'target not set'));
      }
      if (state.currentPhase === 'build') {
        console.log(chalk.bold('  Checkpoint: ') + (state.checkpointStatus || 'unknown'));
      }
      print.blank();

      if (state.personas?.length) {
        console.log(chalk.bold(`  Personas (${state.personas.length}):`));
        state.personas.forEach((persona) => console.log('    ' + chalk.green('✓ ') + persona));
      }

      if (state.outcomes?.length) {
        console.log(chalk.bold(`  Outcomes (${state.outcomes.length}):`));
        state.outcomes.forEach((outcome) => {
          const icon = outcome.status === 'verified'
            ? chalk.green('✓')
            : outcome.status === 'reviewed'
              ? chalk.yellow('◑')
              : chalk.dim('○');
          console.log('    ' + icon + ' ' + outcome.name + chalk.dim(' [' + (outcome.status || 'draft') + ']'));
        });
      }

      print.blank();
      console.log(chalk.dim('  Open your AI coding agent and resume with /odd in Claude/OpenCode or by saying use ODD in Codex. Say ODD status in Codex for a state-only check.'));
      print.blank();
    });
}
