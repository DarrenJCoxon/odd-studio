import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

const HOOKS_DIR = path.resolve(import.meta.dirname, '..', 'hooks');

describe('hook security (audit #4)', () => {
  describe('odd-studio.sh', () => {
    let content;

    it('loads the hook script', async () => {
      content = await fs.readFile(path.join(HOOKS_DIR, 'odd-studio.sh'), 'utf8');
      expect(content).toBeTruthy();
    });

    it('does not interpolate shell vars directly into node -e strings', async () => {
      content = await fs.readFile(path.join(HOOKS_DIR, 'odd-studio.sh'), 'utf8');
      const nodeBlocks = content.match(/node -e "[\s\S]*?"\s*2>/g) || [];

      for (const block of nodeBlocks) {
        const jsContent = block.replace(/^node -e "/, '').replace(/"\s*2>$/, '');

        // Shell variables inside JS should only appear as process.env references
        const shellVarInJs = jsContent.match(/\$[A-Z_]+/g) || [];
        for (const v of shellVarInJs) {
          // These are OK — they're outside the JS, in the env assignment prefix
          // We check that no $VAR appears inside a JS string literal
          const inString = new RegExp(`['"].*\\${v}.*['"]`);
          expect(inString.test(jsContent)).toBe(false);
        }
      }
    });

    it('uses process.env for all data passed to node -e', async () => {
      content = await fs.readFile(path.join(HOOKS_DIR, 'odd-studio.sh'), 'utf8');
      const nodeBlocks = content.match(/node -e "([\s\S]*?)"\s*2>/g) || [];

      for (const block of nodeBlocks) {
        if (block.includes('readFileSync') || block.includes('writeFileSync')) {
          expect(block).toContain('process.env');
        }
      }
    });

    it('records lastCommitAt alongside other commit metadata', async () => {
      content = await fs.readFile(path.join(HOOKS_DIR, 'odd-studio.sh'), 'utf8');
      expect(content).toContain('state.lastCommitAt = process.env.ODD_TIME;');
    });

    it('includes checkpoint and security quality gates', async () => {
      content = await fs.readFile(path.join(HOOKS_DIR, 'odd-studio.sh'), 'utf8');
      expect(content).toContain('checkpoint-gate');
      expect(content).toContain('checkpoint-validate');
      expect(content).toContain('security-quality');
      expect(content).toContain('.checkpoint-dirty');
      expect(content).toContain('.checkpoint-clear');
    });

    it('requires jq before processing', async () => {
      content = await fs.readFile(path.join(HOOKS_DIR, 'odd-studio.sh'), 'utf8');
      const jqCheck = content.indexOf('command -v jq');
      const firstJqUse = content.indexOf('| jq');
      expect(jqCheck).toBeLessThan(firstJqUse);
    });
  });

  describe('post-commit-hook.sh', () => {
    it('uses process.env for state file path', async () => {
      const content = await fs.readFile(path.join(HOOKS_DIR, 'post-commit-hook.sh'), 'utf8');
      const nodeBlock = content.match(/node -e "([\s\S]*?)"\s*2>/);
      expect(nodeBlock).toBeTruthy();
      expect(nodeBlock[1]).toContain('process.env.ODD_STATE_FILE');
    });

    it('does not use shell interpolation inside node -e JS', async () => {
      const content = await fs.readFile(path.join(HOOKS_DIR, 'post-commit-hook.sh'), 'utf8');
      const nodeBlock = content.match(/node -e "([\s\S]*?)"\s*2>/);
      const js = nodeBlock[1];
      // Should not have $STATE_FILE inside the JS string
      expect(js).not.toMatch(/readFileSync\(['"].*\$STATE_FILE/);
    });
  });
});
