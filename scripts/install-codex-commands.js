'use strict';
import fs from 'fs-extra';
import path from 'path';
import { COMMANDS } from './command-definitions.js';
import { CODEX_PLUGIN_NAME } from './assets.js';

const CODEX_ODD_ROOT = `plugins/${CODEX_PLUGIN_NAME}/skills/odd/`;
const CODEX_COMMAND_PREFIX = `/${CODEX_PLUGIN_NAME}:`;

export default async function installCodexCommands(pluginDest) {
  const commandsDest = path.join(pluginDest, 'commands');
  await fs.ensureDir(commandsDest);

  for (const cmd of COMMANDS) {
    const content = cmd.source
      ? buildMainCommand(cmd)
      : buildSubcommand(cmd);
    await fs.writeFile(path.join(commandsDest, `${cmd.name}.md`), content);
  }

  return { destination: commandsDest, commandCount: COMMANDS.length };
}

function buildMainCommand(cmd) {
  return [
    '---',
    `description: "${cmd.description}"`,
    '---',
    '',
    `# ${CODEX_COMMAND_PREFIX}${cmd.name}`,
    '',
    'You are now operating as the ODD Studio coach.',
    '',
    'Read this file now:',
    `- \`${CODEX_ODD_ROOT}SKILL.md\` — the full ODD Studio coach`,
    '',
    'Then execute the startup state check exactly as documented.',
    '',
  ].join('\n');
}

function buildSubcommand(cmd) {
  return [
    '---',
    `description: "${cmd.description}"`,
    '---',
    '',
    `# ${CODEX_COMMAND_PREFIX}${cmd.name}`,
    '',
    rewriteBody(cmd.body),
    '',
  ].join('\n');
}

function rewriteBody(body) {
  return body.replace(/`\.opencode\/odd\//g, `\`${CODEX_ODD_ROOT}`);
}
