import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('removeItem integration (tasks)', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTaskLocal(name: string): Promise<string> {
    const result = await addOmniFocusTask({ name });
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);
      await waitForSync();
      return result.taskId;
    }
    throw new Error(`Failed to create task: ${JSON.stringify(result)}`);
  }

  afterEach(async () => {
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;
  });

  it('should remove task by ID', async () => {
    const taskName = `RemoveItem Test - ByID ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await removeItem({ id: taskId, itemType: 'task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);
    }

    // Verify deletion
    await waitForSync();
    const getResult = await getTask({ id: taskId });
    expect(getResult.success).toBe(false);

    // Remove from cleanup list since already deleted
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should remove task by name', async () => {
    const taskName = `RemoveItem Test - ByName ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await removeItem({ name: taskName, itemType: 'task' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);
      expect(result.name).toBe(taskName);
    }

    // Remove from cleanup list since already deleted
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should return error for non-existent task ID', async () => {
    const result = await removeItem({
      id: 'nonexistent-task-id-12345',
      itemType: 'task'
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent task name', async () => {
    const result = await removeItem({
      name: 'This Task Does Not Exist At All 12345',
      itemType: 'task'
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for missing identifier', async () => {
    const result = await removeItem({ itemType: 'task' });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('id or name');
    }
  });

  it('should return error for invalid item type', async () => {
    const taskName = `RemoveItem Test - BadType ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await removeItem({
      id: taskId,
      itemType: 'folder' as 'task' | 'project' // Force invalid type
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('itemType');
    }
  });

  it('should handle task name with special characters', async () => {
    const taskName = `RemoveItem Test - Special !@#$% ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await removeItem({ id: taskId, itemType: 'task' });

    expect(result.success).toBe(true);

    // Remove from cleanup list since already deleted
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should not fail when removing already deleted task', async () => {
    const taskName = `RemoveItem Test - Double ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // First delete
    const result1 = await removeItem({ id: taskId, itemType: 'task' });
    expect(result1.success).toBe(true);

    // Second delete should fail gracefully
    const result2 = await removeItem({ id: taskId, itemType: 'task' });
    expect(result2.success).toBe(false);
    if (!result2.success && result2.error) {
      expect(result2.error).toContain('not found');
    }

    // Remove from cleanup list since already deleted
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });
});
