'use strict';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { mergeStateWithDefaults } from './state-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES = path.resolve(__dirname, '..', 'templates');
const SAFE_PROJECT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export default async function scaffoldProject(targetDir, projectName, agent = 'claude-code', options = {}) {
  if (!SAFE_PROJECT_NAME.test(projectName)) {
    throw new Error(
      `Invalid project name: "${projectName}". Use only letters, numbers, dots, hyphens, and underscores.`
    );
  }
  const isClaude = agent === 'claude-code' || agent === 'both';
  const isOpenCode = agent === 'opencode' || agent === 'both';
  const isCodex = agent === 'codex' || agent === 'all';
  const wantsAgentsMd = isOpenCode || isCodex;
  const wantsClaudeMd = isClaude || agent === 'all';

  await fs.ensureDir(targetDir);

  // Copy templates — skip agent-specific files that don't apply
  await fs.copy(TEMPLATES, targetDir, {
    overwrite: false, // Never overwrite existing user files
    filter: (src) => {
      const basename = path.basename(src);
      // Skip .gitkeep in non-empty directories
      if (basename === '.gitkeep') {
        const dir = path.dirname(src);
        const destDir = dir.replace(TEMPLATES, targetDir);
        return !fs.existsSync(destDir) || fs.readdirSync(destDir).length === 0;
      }
      // Skip CLAUDE.md if OpenCode-only
      if (basename === 'CLAUDE.md' && !wantsClaudeMd) return false;
      if (basename === 'AGENTS.md' && !wantsAgentsMd) return false;
      return true;
    },
  });

  // Patch CLAUDE.md with project name (if present)
  const claudeMd = path.join(targetDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    let content = await fs.readFile(claudeMd, 'utf8');
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    await fs.writeFile(claudeMd, content);
  }

  // Patch AGENTS.md with project name (if present)
  const agentsMd = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(agentsMd)) {
    let content = await fs.readFile(agentsMd, 'utf8');
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    await fs.writeFile(agentsMd, content);
  }

  // Patch .odd/state.json with project name and timestamp
  const stateFile = path.join(targetDir, '.odd', 'state.json');
  if (fs.existsSync(stateFile)) {
    const state = mergeStateWithDefaults(await fs.readJson(stateFile));
    state.projectName = projectName;
    state.initialisedAt = state.initialisedAt || new Date().toISOString();
    await fs.writeJson(stateFile, state, { spaces: 2 });
  }

  // Create .vscode/extensions.json with recommended extensions
  const vscodeDir = path.join(targetDir, '.vscode');
  const extensionsFile = path.join(vscodeDir, 'extensions.json');
  if (!fs.existsSync(extensionsFile)) {
    await fs.ensureDir(vscodeDir);
    await fs.writeJson(extensionsFile, {
      recommendations: [
        'pomdtr.excalidraw-editor'
      ]
    }, { spaces: 2 });
  }

  // Initialise git if not already a repo
  const gitDir = path.join(targetDir, '.git');
  if (!options.skipGit && !fs.existsSync(gitDir)) {
    const { execFileSync } = await import('child_process');
    try {
      execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
      execFileSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', `Initial ODD Studio scaffold for ${projectName}`], {
        cwd: targetDir,
        stdio: 'ignore',
      });
    } catch {
      // Git init is best-effort — don't fail the whole install
    }
  }

  return { targetDir };
}
