'use strict';

import chalk from 'chalk';

export const print = {
  logo: () => {
    console.log(chalk.bold.cyan('\n  🎯 ODD Studio'));
    console.log(chalk.dim('  Outcome-Driven Development for AI coding agents\n'));
  },
  step: (n, total, msg) => console.log(chalk.dim(`  [${n}/${total}]`) + ' ' + msg),
  ok: (msg) => console.log(chalk.green('  ✓ ') + msg),
  warn: (msg) => console.log(chalk.yellow('  ⚠ ') + msg),
  err: (msg) => console.log(chalk.red('  ✗ ') + msg),
  info: (msg) => console.log(chalk.dim('  → ') + msg),
  blank: () => console.log(),
};
