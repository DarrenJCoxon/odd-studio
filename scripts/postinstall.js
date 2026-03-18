// postinstall.js — runs after npm install
// Only installs skill + hooks when running as a global install (npx or npm install -g).
// Does NOT run during project-level npm install to avoid side effects.

'use strict';

// Detect if this is a global install or npx execution
const isGlobal = process.env.npm_config_global === 'true';
const isNpx = process.env.npm_lifecycle_script?.includes('npx');

if (!isGlobal && !isNpx) {
  // Project-level install — skip automatic setup
  process.exit(0);
}

import('./install-skill.js')
  .then(({ default: installSkill }) => {
    const pkg = new URL('..', import.meta.url).pathname;
    return installSkill(pkg.replace(/\/$/, ''));
  })
  .then(() => {
    console.log('✓ ODD Studio: /odd skill installed into Claude Code');
  })
  .catch((e) => {
    // Non-fatal — user can run odd-studio init manually
    console.log('⚠ ODD Studio: Could not auto-install skill (' + e.message + ')');
    console.log('  Run: npx odd-studio init  to complete setup.');
  });
