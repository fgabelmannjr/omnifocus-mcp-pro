import tmp from 'tmp';

// Ensure temp files are cleaned up on process exit
tmp.setGracefulCleanup();

/**
 * Result from creating a secure temporary file.
 * Includes the file path and a cleanup function.
 */
export interface SecureTempFile {
  path: string;
  cleanup: () => void;
}

/**
 * Create a secure temporary file using the tmp library.
 *
 * This addresses CWE-377 and CWE-378 by:
 * - Creating files atomically (no race condition)
 * - Setting secure permissions (0600 by default)
 * - Ensuring the file doesn't already exist
 * - Providing automatic cleanup
 *
 * @param prefix - Optional prefix for the filename (e.g., 'jxa_script')
 * @param extension - File extension including the dot (e.g., '.js', '.applescript')
 * @returns Object with the file path and cleanup function
 */
export function createSecureTempFile(prefix: string = 'temp', extension: string = '.tmp'): SecureTempFile {
  const file = tmp.fileSync({
    prefix: `${prefix}_`,
    postfix: extension,
    mode: 0o600, // Read/write for owner only
  });

  return {
    path: file.name,
    cleanup: () => file.removeCallback(),
  };
}

/**
 * Legacy function for backward compatibility.
 * Returns just the path string. Caller is responsible for cleanup.
 *
 * @deprecated Use createSecureTempFile() instead for proper cleanup handling
 */
export function getSecureTempFilePath(prefix: string = 'temp', extension: string = '.tmp'): string {
  const file = tmp.fileSync({
    prefix: `${prefix}_`,
    postfix: extension,
    mode: 0o600,
  });
  return file.name;
}

/**
 * Legacy function for backward compatibility (direct /tmp path).
 * Returns just the path string. Caller is responsible for cleanup.
 *
 * @deprecated Use createSecureTempFile() instead for proper cleanup handling
 */
export function getSecureTempFilePathDirect(prefix: string = 'temp', extension: string = '.tmp'): string {
  const file = tmp.fileSync({
    prefix: `${prefix}_`,
    postfix: extension,
    mode: 0o600,
  });
  return file.name;
}
