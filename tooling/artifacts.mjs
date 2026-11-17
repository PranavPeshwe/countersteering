import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const ARTIFACT_ROOT = 'Q:\\pp_exp\\pp_countersteering_artifacts';

if (!existsSync(ARTIFACT_ROOT)) {
  throw new Error(`Required generated-output directory is unavailable: ${ARTIFACT_ROOT}`);
}

/** @param {...string} parts */
export function artifactPath(...parts) {
  return join(ARTIFACT_ROOT, ...parts);
}

/** @param {string} name */
export function artifactDirectory(name) {
  const directory = artifactPath(name);
  mkdirSync(directory, { recursive: true });
  return directory;
}
