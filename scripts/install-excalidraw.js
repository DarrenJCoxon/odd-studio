'use strict';
import fs from 'fs-extra';
import path from 'path';

/**
 * Installs the excalidraw skill into the project.
 *
 * Copies SKILL.md to <projectDir>/.claude/skills/excalidraw/
 * Nothing is written to ~/
 */
export default async function installExcalidraw(packageRoot, targetDir, options = {}) {
  const source = path.join(packageRoot, 'scripts', 'excalidraw-skill');
  const destination = path.join(targetDir, '.claude', 'skills', 'excalidraw');

  await fs.ensureDir(path.join(targetDir, '.claude', 'skills'));

  if (fs.existsSync(destination) && !options.force) {
    const backup = destination + '.backup-' + Date.now();
    await fs.move(destination, backup);
  }

  await fs.copy(source, destination);

  return { destination };
}
