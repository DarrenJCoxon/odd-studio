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

const pkg = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

Promise.all([
  import('./install-skill.js').then(({ default: installSkill }) => installSkill(pkg)),
  import('./setup-hooks.js').then(({ default: setupHooks }) => setupHooks(pkg)),
  import('./setup-mcp.js').then(({ default: setupMcp }) => setupMcp()),
])
  .then(() => {
    console.log('✓ ODD Studio: /odd skill, safety hooks, and ruflo memory installed into Claude Code');
    console.log('  → Restart Claude Code now to activate ruflo memory and hooks.');
    console.log('  Run: npx odd-studio init [project-name]  to scaffold your first project.');
  })
  .catch((e) => {
    // Non-fatal — user can run odd-studio init manually
    console.log('⚠ ODD Studio: Could not complete setup (' + e.message + ')');
    console.log('  Run: npx odd-studio init  to complete setup.');
  });
