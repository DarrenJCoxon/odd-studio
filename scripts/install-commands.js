'use strict';
import fs from 'fs-extra';
import path from 'path';
import { COMMANDS } from './command-definitions.js';

/**
 * Installs ODD Studio commands into OpenCode's command directory.
 *
 * Claude Code uses project-local skills (.claude/skills/odd/SKILL.md).
 * OpenCode uses project-local commands (.opencode/commands/odd.md).
 *
 * The prompt content is identical — only the frontmatter format and
 * file-path references differ.
 */

/**
 * Installs ODD commands into <projectDir>/.opencode/commands/.
 *
 * For the main /odd command, copies the full skill tree into the project's
 * .opencode/odd/ directory (so the commands can reference it via relative paths).
 * For sub-commands, generates markdown command files with OpenCode frontmatter.
 */
export default async function installCommands(packageRoot, targetDir, options = {}) {
  const OC_COMMANDS = path.join(targetDir, '.opencode', 'commands');
  await fs.ensureDir(OC_COMMANDS);

  // Install sub-commands as markdown files
  for (const cmd of COMMANDS) {
    if (cmd.source) continue; // Main /odd handled separately below

    const content = [
      '---',
      `description: "${cmd.description}"`,
      '---',
      '',
      `# /${cmd.name}`,
      '',
      cmd.body,
      '',
    ].join('\n');

    await fs.writeFile(path.join(OC_COMMANDS, `${cmd.name}.md`), content);
  }

  // Copy the main skill tree to a project-local location OpenCode commands can reference.
  const oddKnowledge = path.join(targetDir, '.opencode', 'odd');
  const skillSource = path.join(packageRoot, 'skill');
  await fs.copy(skillSource, oddKnowledge, { overwrite: true });

  // Rewrite the main SKILL.md path references for OpenCode
  const mainSkill = path.join(oddKnowledge, 'SKILL.md');
  if (fs.existsSync(mainSkill)) {
    let content = await fs.readFile(mainSkill, 'utf8');
    content = content.replace(/~\/\.claude\/skills\/odd\//g, '.opencode/odd/');
    await fs.writeFile(mainSkill, content);
  }

  // Generate the /odd command that loads the main skill
  const oddCmd = [
    '---',
    `description: "${COMMANDS[0].description}"`,
    '---',
    '',
    '# /odd',
    '',
    'You are now operating as the ODD Studio coach.',
    '',
    'Read this file now:',
    '- `.opencode/odd/SKILL.md` — the full ODD Studio coach',
    '',
    'Then execute the startup state check exactly as documented.',
    '',
  ].join('\n');

  await fs.writeFile(path.join(OC_COMMANDS, 'odd.md'), oddCmd);

  return { destination: OC_COMMANDS, commandCount: COMMANDS.length };
}
