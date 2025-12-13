export { isOmniFocusAvailable, skipIfOmniFocusUnavailable } from './omnifocusAvailable.js';
export {
  cleanupTestFolder,
  deleteTestFolder,
  ensureTestFolder,
  getTestFolderId,
  TEST_FOLDER_NAME
} from './testFolder.js';
export {
  cleanupTestTags,
  createTestTag,
  deleteTestTag,
  getTagIdByName,
  TEST_TAG_PREFIX
} from './testTag.js';
export { createTestTask, deleteTestTask, TEST_TASK_PREFIX } from './testTask.js';

/**
 * Wait for OmniFocus to sync after a mutation operation.
 * OmniFocus operations complete but data may not be immediately readable.
 * @param ms - Milliseconds to wait (default 1000ms for reliability)
 */
export function waitForSync(ms = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
