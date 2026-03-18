'use strict';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES = path.resolve(__dirname, '..', 'templates');

export default async function scaffoldProject(targetDir, projectName) {
  await fs.ensureDir(targetDir);

  // Copy templates
  await fs.copy(TEMPLATES, targetDir, {
    overwrite: false, // Never overwrite existing user files
    filter: (src) => {
      // Skip .gitkeep in non-empty directories
      if (src.endsWith('.gitkeep')) {
        const dir = path.dirname(src);
        const destDir = dir.replace(TEMPLATES, targetDir);
        return !fs.existsSync(destDir) || fs.readdirSync(destDir).length === 0;
      }
      return true;
    },
  });

  // Patch CLAUDE.md with project name
  const claudeMd = path.join(targetDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    let content = await fs.readFile(claudeMd, 'utf8');
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    await fs.writeFile(claudeMd, content);
  }

  // Patch .odd/state.json with project name and timestamp
  const stateFile = path.join(targetDir, '.odd', 'state.json');
  if (fs.existsSync(stateFile)) {
    const state = await fs.readJson(stateFile);
    state.projectName = projectName;
    state.initialisedAt = new Date().toISOString();
    await fs.writeJson(stateFile, state, { spaces: 2 });
  }

  // Initialise git if not already a repo
  const gitDir = path.join(targetDir, '.git');
  if (!fs.existsSync(gitDir)) {
    const { execSync } = await import('child_process');
    try {
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      execSync('git add -A', { cwd: targetDir, stdio: 'ignore' });
      execSync(`git commit -m "Initial ODD Studio scaffold for ${projectName}"`, {
        cwd: targetDir,
        stdio: 'ignore',
      });
    } catch {
      // Git init is best-effort — don't fail the whole install
    }
  }

  return { targetDir };
}
