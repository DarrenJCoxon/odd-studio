'use strict';
import fs from 'fs-extra';
import path from 'path';

/**
 * Installs ODD Studio skills into <projectDir>/.claude/skills/.
 *
 * Everything stays project-local — nothing is written to ~/
 *
 * - skill/          -> <projectDir>/.claude/skills/odd/
 * - skill/odd-X/    -> <projectDir>/.claude/skills/odd-X/
 */
export default async function installSkill(packageRoot, targetDir, options = {}) {
  const skillDir = path.join(packageRoot, 'skill');
  const skillsDest = path.join(targetDir, '.claude', 'skills');

  if (!fs.existsSync(skillDir)) {
    throw new Error(`Skill source not found at ${skillDir}`);
  }

  await fs.ensureDir(skillsDest);

  const oddDest = path.join(skillsDest, 'odd');
  await fs.ensureDir(oddDest);

  const entries = await fs.readdir(skillDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(skillDir, entry.name);
    if (entry.isDirectory() && fs.existsSync(path.join(src, 'SKILL.md'))) {
      await fs.copy(src, path.join(skillsDest, entry.name), { overwrite: true });
    } else {
      await fs.copy(src, path.join(oddDest, entry.name), { overwrite: true });
    }
  }

  return { destination: skillsDest };
}
