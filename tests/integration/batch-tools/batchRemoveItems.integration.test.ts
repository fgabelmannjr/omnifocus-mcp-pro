import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { batchRemoveItems } from '../../../src/tools/primitives/batchRemoveItems.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('batchRemoveItems integration', () => {
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

  it('should remove single task', async () => {
    const taskName = `BatchRemove Test - Single ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await batchRemoveItems([{ id: taskId, itemType: 'task' }]);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].id).toBe(taskId);

    // Verify deletion
    await waitForSync();
    const getResult = await getTask({ id: taskId });
    expect(getResult.success).toBe(false);

    // Remove from cleanup list
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should remove multiple tasks', async () => {
    const baseName = `BatchRemove Test - Multi ${Date.now()}`;
    const id1 = await createTaskLocal(`${baseName} 1`);
    const id2 = await createTaskLocal(`${baseName} 2`);
    const id3 = await createTaskLocal(`${baseName} 3`);

    const result = await batchRemoveItems([
      { id: id1, itemType: 'task' },
      { id: id2, itemType: 'task' },
      { id: id3, itemType: 'task' }
    ]);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);
    expect(result.results[2].success).toBe(true);

    // Clear cleanup list since all deleted
    createdTaskIds.length = 0;
  });

  it('should remove task by name', async () => {
    const taskName = `BatchRemove Test - ByName ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await batchRemoveItems([{ name: taskName, itemType: 'task' }]);

    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].id).toBe(taskId);

    // Remove from cleanup list
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should handle partial failures', async () => {
    const validName = `BatchRemove Test - Valid ${Date.now()}`;
    const validId = await createTaskLocal(validName);

    const result = await batchRemoveItems([
      { id: validId, itemType: 'task' },
      { id: 'nonexistent-id-12345', itemType: 'task' } // Will fail
    ]);

    // Overall success because at least one succeeded
    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);

    // Remove validId from cleanup
    const index = createdTaskIds.indexOf(validId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should maintain results at original indices', async () => {
    const name1 = `BatchRemove Test - Idx0 ${Date.now()}`;
    const name3 = `BatchRemove Test - Idx2 ${Date.now()}`;
    const id1 = await createTaskLocal(name1);
    const id3 = await createTaskLocal(name3);

    const result = await batchRemoveItems([
      { id: id1, itemType: 'task' },
      { id: 'nonexistent-12345', itemType: 'task' }, // Will fail
      { id: id3, itemType: 'task' }
    ]);

    expect(result.results).toHaveLength(3);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].id).toBe(id1);
    expect(result.results[1].success).toBe(false);
    expect(result.results[2].success).toBe(true);
    expect(result.results[2].id).toBe(id3);

    // Clear cleanup list for successfully deleted
    createdTaskIds.length = 0;
  });

  it('should return error for empty array', async () => {
    const result = await batchRemoveItems([]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should return error for all non-existent items', async () => {
    const result = await batchRemoveItems([
      { id: 'nonexistent-1', itemType: 'task' },
      { id: 'nonexistent-2', itemType: 'task' }
    ]);

    // Overall failure when no items succeed
    expect(result.success).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(false);
    expect(result.results[1].success).toBe(false);
  });

  it('should handle mixed task and project removal', async () => {
    // Just test task removal since project requires more setup
    const taskName = `BatchRemove Test - Mixed ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await batchRemoveItems([
      { id: taskId, itemType: 'task' },
      { id: 'fake-project-id', itemType: 'project' } // Will fail
    ]);

    expect(result.success).toBe(true); // At least task succeeded
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);

    // Remove from cleanup
    const index = createdTaskIds.indexOf(taskId);
    if (index > -1) createdTaskIds.splice(index, 1);
  });

  it('should handle duplicate removal gracefully', async () => {
    const taskName = `BatchRemove Test - Dup ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // Remove same task twice in batch
    const result = await batchRemoveItems([
      { id: taskId, itemType: 'task' },
      { id: taskId, itemType: 'task' } // Second removal should fail
    ]);

    // First should succeed, second should fail (task already gone)
    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);

    // Clear cleanup
    createdTaskIds.length = 0;
  });
});
