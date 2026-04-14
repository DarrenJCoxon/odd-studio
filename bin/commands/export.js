'use strict';

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

export function registerExport(program, deps) {
  const { print } = deps;

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
      print.info('Open your AI coding agent and run: ' + chalk.cyan('/odd') + ' then ' + chalk.cyan('*export'));
      print.info('The Session Brief will be saved to ' + chalk.cyan('docs/session-brief-[N].md'));
      print.blank();
    });
}
