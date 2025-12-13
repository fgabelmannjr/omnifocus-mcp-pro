import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';

export const TEST_TASK_PREFIX = 'MCP Test Task';

/**
 * Create a test task with the standard prefix.
 * @param name - Task name suffix (will be prefixed with TEST_TASK_PREFIX)
 * @returns Created task ID
 */
export async function createTestTask(name: string): Promise<string> {
  const fullName = `${TEST_TASK_PREFIX} - ${name}`;
  const result = await addOmniFocusTask({ name: fullName });

  if (!result.success || !result.taskId) {
    throw new Error(result.error || 'Failed to create test task');
  }
  return result.taskId;
}

/**
 * Delete a task by ID.
 */
export async function deleteTestTask(id: string): Promise<void> {
  const result = await removeItem({ id, itemType: 'task' });
  if (!result.success) {
    // Ignore cleanup errors - task might already be deleted
  }
}
