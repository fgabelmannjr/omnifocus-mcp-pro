import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, beforeEach } from 'vitest';

const execFileAsync = promisify(execFile);

/**
 * Check if OmniFocus is installed and accessible via osascript.
 * Returns true if OmniFocus can execute a simple query.
 */
export async function isOmniFocusAvailable(): Promise<boolean> {
  try {
    const script = `
      const app = Application('OmniFocus');
      app.includeStandardAdditions = true;
      JSON.stringify({ available: true, name: app.name() });
    `;
    const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', script], {
      timeout: 10000 // 10 second timeout
    });
    const result = JSON.parse(stdout.trim());
    return result.available === true;
  } catch {
    return false;
  }
}

/**
 * Skip test suite if OmniFocus is not available.
 * Use at the top of integration test files.
 *
 * @example
 * describe('createProject integration', () => {
 *   skipIfOmniFocusUnavailable();
 *   // ... tests
 * });
 */
export function skipIfOmniFocusUnavailable(): void {
  let available = false;

  beforeAll(async () => {
    available = await isOmniFocusAvailable();
    if (!available) {
      console.log('⚠️  OmniFocus not available - skipping integration tests');
    }
  });

  beforeEach(({ skip }) => {
    if (!available) {
      skip();
    }
  });
}
