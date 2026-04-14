'use strict';
import fs from 'fs-extra';
import path from 'path';
import { OPEN_CODE_PLUGIN_FILES } from './assets.js';

/**
 * Installs the ODD Studio plugin for OpenCode into the project directory.
 *
 * Copies to <projectDir>/.opencode/plugins/ — nothing written to ~/
 */
export default async function setupPlugin(packageRoot, targetDir) {
  const pluginsDest = path.join(targetDir, '.opencode', 'plugins');
  await fs.ensureDir(pluginsDest);

  for (const file of OPEN_CODE_PLUGIN_FILES) {
    const source = path.join(packageRoot, 'plugins', file);
    const destination = path.join(pluginsDest, file);
    if (fs.existsSync(source)) {
      await fs.copy(source, destination, { overwrite: true });
    }
  }

  return { pluginInstalled: true, destination: path.join(pluginsDest, 'odd-studio-plugin.js') };
}
