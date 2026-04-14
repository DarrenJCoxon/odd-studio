#!/usr/bin/env node
'use strict';

import { program } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { print } from './ui.js';
import { registerInit } from './commands/init.js';
import { registerStatus } from './commands/status.js';
import { registerUpgrade } from './commands/upgrade.js';
import { registerExport } from './commands/export.js';
import { registerUninstall } from './commands/uninstall.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require('../package.json'); // v3.6.0

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const deps = { PACKAGE_ROOT, print };

program
  .name('odd-studio')
  .description('Outcome-Driven Development harness for AI coding agents')
  .version(pkg.version);

registerInit(program, deps);
registerStatus(program, deps);
registerUpgrade(program, deps);
registerExport(program, deps);
registerUninstall(program, deps);

program.parse();
