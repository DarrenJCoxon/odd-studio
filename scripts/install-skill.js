'use strict';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Installs the /odd skill into ~/.claude/skills/odd/
 * Copies skill/ directory from the package root.
 */
export default async function installSkill(packageRoot, options = {}) {
  const source = path.join(packageRoot, 'skill');
  const destination = path.join(os.homedir(), '.claude', 'skills', 'odd');

  if (!fs.existsSync(source)) {
    throw new Error(`Skill source not found at ${source}`);
  }

  // Ensure ~/.claude/skills/ exists
  await fs.ensureDir(path.join(os.homedir(), '.claude', 'skills'));

  // If destination exists and not forcing, back it up
  if (fs.existsSync(destination) && !options.force) {
    const backup = destination + '.backup-' + Date.now();
    await fs.move(destination, backup);
  }

  await fs.copy(source, destination, { overwrite: true });

  return { destination };
}
