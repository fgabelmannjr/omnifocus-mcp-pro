import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Generate a cryptographically secure temporary file path.
 *
 * Uses crypto.randomUUID() to generate unpredictable file names,
 * preventing symlink attacks and race conditions (CWE-377, CWE-378).
 *
 * @param prefix - Optional prefix for the filename (e.g., 'jxa_script')
 * @param extension - File extension including the dot (e.g., '.js', '.applescript')
 * @returns Full path to the secure temporary file
 */
export function getSecureTempFilePath(prefix: string = 'temp', extension: string = '.tmp'): string {
  const uuid = randomUUID();
  const filename = `${prefix}_${uuid}${extension}`;
  return join(tmpdir(), filename);
}

/**
 * Generate a cryptographically secure temporary file path using /tmp directly.
 *
 * Some legacy code uses /tmp directly; this maintains compatibility while
 * adding security through unpredictable UUIDs.
 *
 * @param prefix - Optional prefix for the filename
 * @param extension - File extension including the dot
 * @returns Full path to the secure temporary file in /tmp
 */
export function getSecureTempFilePathDirect(prefix: string = 'temp', extension: string = '.tmp'): string {
  const uuid = randomUUID();
  return `/tmp/${prefix}_${uuid}${extension}`;
}
