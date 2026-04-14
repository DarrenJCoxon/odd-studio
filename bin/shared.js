'use strict';

import fs from 'fs-extra';

export async function removeIfEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) return false;
  const entries = await fs.readdir(dirPath);
  if (entries.length > 0) return false;
  await fs.remove(dirPath);
  return true;
}
