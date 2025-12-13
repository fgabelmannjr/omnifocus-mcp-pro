import { isOmniFocusAvailable } from './helpers/omnifocusAvailable.js';
import { cleanupTestFolder, ensureTestFolder, TEST_FOLDER_NAME } from './helpers/testFolder.js';

let testFolderId: string | null = null;

/**
 * Global setup - runs ONCE before all test files
 */
export async function setup(): Promise<void> {
  // Check if OmniFocus is available
  const available = await isOmniFocusAvailable();
  if (!available) {
    console.log('\n⚠️  OmniFocus not available - integration tests will be skipped\n');
    return;
  }

  // Ensure test folder exists
  try {
    testFolderId = await ensureTestFolder();
    console.log(`\n✅ Test folder "${TEST_FOLDER_NAME}" ready (ID: ${testFolderId})\n`);
  } catch (error) {
    console.error('\n❌ Failed to create test folder:', error);
    throw error;
  }
}

/**
 * Global teardown - runs ONCE after all test files complete
 */
export async function teardown(): Promise<void> {
  if (!testFolderId) {
    return;
  }

  // Clean up all test data
  try {
    await cleanupTestFolder(testFolderId);
    console.log(`\n🧹 Test folder "${TEST_FOLDER_NAME}" cleaned up (global teardown)\n`);
  } catch (error) {
    console.error('\n⚠️  Failed to cleanup test folder:', error);
  }
}
