import { beforeAll } from 'vitest';
import { isOmniFocusAvailable } from './helpers/omnifocusAvailable.js';
import { ensureTestFolder, TEST_FOLDER_NAME } from './helpers/testFolder.js';

// Use globalThis to share state between setup and test files
// Vitest's setupFiles run in a separate context from test files
declare global {
  // eslint-disable-next-line no-var
  var __testFolderId: string | null;
  // eslint-disable-next-line no-var
  var __omnifocusAvailable: boolean;
}

// Only initialize if not already set (prevents reset on re-import)
if (globalThis.__testFolderId === undefined) {
  globalThis.__testFolderId = null;
}
if (globalThis.__omnifocusAvailable === undefined) {
  globalThis.__omnifocusAvailable = false;
}

beforeAll(async () => {
  // Check if OmniFocus is available
  globalThis.__omnifocusAvailable = await isOmniFocusAvailable();

  if (!globalThis.__omnifocusAvailable) {
    console.log('\n⚠️  OmniFocus not available - integration tests will be skipped\n');
    return;
  }

  // Ensure test folder exists (created by globalSetup, but we need the ID)
  try {
    globalThis.__testFolderId = await ensureTestFolder();
    console.log(
      `\n✅ Test folder "${TEST_FOLDER_NAME}" ready (ID: ${globalThis.__testFolderId})\n`
    );
  } catch (error) {
    console.error('\n❌ Failed to create test folder:', error);
    throw error;
  }
});

// NOTE: Cleanup is handled by globalSetup.ts teardown() which runs ONCE after all tests complete.
// Individual test files manage their own project cleanup via afterAll hooks.

/**
 * Get the test folder ID for use in tests.
 * Returns null if OmniFocus is not available.
 */
export function getTestFolderId(): string | null {
  return globalThis.__testFolderId;
}

/**
 * Check if OmniFocus is available for tests.
 */
export function isOmniFocusReady(): boolean {
  return globalThis.__omnifocusAvailable && globalThis.__testFolderId !== null;
}
