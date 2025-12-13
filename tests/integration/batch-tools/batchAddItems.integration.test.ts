import { afterEach, describe, expect, it } from 'vitest';
import { batchAddItems } from '../../../src/tools/primitives/batchAddItems.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('batchAddItems integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];

  afterEach(async () => {
    // Clean up tasks first
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;

    // Then projects
    for (const id of [...createdProjectIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'project' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;
  });

  it('should create single task', async () => {
    const taskName = `BatchAdd Test - Single ${Date.now()}`;

    const result = await batchAddItems([{ type: 'task', name: taskName }]);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].success).toBe(true);

    if (result.results[0].success && result.results[0].id) {
      createdTaskIds.push(result.results[0].id);

      // Verify task was created
      await waitForSync();
      const getResult = await getTask({ id: result.results[0].id });
      expect(getResult.success).toBe(true);
    }
  });

  it('should create multiple tasks', async () => {
    const baseName = `BatchAdd Test - Multi ${Date.now()}`;

    const result = await batchAddItems([
      { type: 'task', name: `${baseName} 1` },
      { type: 'task', name: `${baseName} 2` },
      { type: 'task', name: `${baseName} 3` }
    ]);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);
    expect(result.results[2].success).toBe(true);

    // Track created items for cleanup
    result.results.forEach((r) => {
      if (r.success && r.id) createdTaskIds.push(r.id);
    });
  });

  it('should create task with properties', async () => {
    const taskName = `BatchAdd Test - Props ${Date.now()}`;
    const taskNote = 'Test note content';

    const result = await batchAddItems([
      {
        type: 'task',
        name: taskName,
        note: taskNote,
        flagged: true
      }
    ]);

    expect(result.success).toBe(true);
    if (result.results[0].success && result.results[0].id) {
      createdTaskIds.push(result.results[0].id);

      await waitForSync();
      const getResult = await getTask({ id: result.results[0].id });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.note).toBe(taskNote);
        expect(getResult.task.flagged).toBe(true);
      }
    }
  });

  it('should create parent-child hierarchy with tempId', async () => {
    const parentName = `BatchAdd Test - Parent ${Date.now()}`;
    const childName = `BatchAdd Test - Child ${Date.now()}`;

    const result = await batchAddItems([
      { type: 'task', name: parentName, tempId: 'parent1', hierarchyLevel: 0 },
      { type: 'task', name: childName, parentTempId: 'parent1', hierarchyLevel: 1 }
    ]);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);

    // Track for cleanup
    result.results.forEach((r) => {
      if (r.success && r.id) createdTaskIds.push(r.id);
    });

    // Verify child has parent reference
    if (result.results[1].success && result.results[1].id) {
      await waitForSync();
      const childResult = await getTask({ id: result.results[1].id });
      expect(childResult.success).toBe(true);
      if (childResult.success) {
        expect(childResult.task.parent).toBeTruthy();
      }
    }
  });

  it('should detect and fail on circular dependencies', async () => {
    // Create a cycle: A -> B -> A
    const result = await batchAddItems([
      { type: 'task', name: 'Cycle A', tempId: 'A', parentTempId: 'B' },
      { type: 'task', name: 'Cycle B', tempId: 'B', parentTempId: 'A' }
    ]);

    // Both items should fail due to cycle
    expect(result.results[0].success).toBe(false);
    expect(result.results[1].success).toBe(false);

    if (!result.results[0].success && result.results[0].error) {
      expect(result.results[0].error.toLowerCase()).toContain('cycle');
    }
  });

  it('should fail for unknown parentTempId', async () => {
    const result = await batchAddItems([
      { type: 'task', name: 'Orphan Task', parentTempId: 'nonexistent' }
    ]);

    expect(result.results[0].success).toBe(false);
    if (!result.results[0].success && result.results[0].error) {
      expect(result.results[0].error).toContain('parentTempId');
    }
  });

  it('should handle partial failures', async () => {
    const validName = `BatchAdd Test - Valid ${Date.now()}`;

    const result = await batchAddItems([
      { type: 'task', name: validName },
      { type: 'task', name: 'Bad Task', parentTempId: 'nonexistent' } // Will fail
    ]);

    // Overall success because at least one succeeded
    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);

    if (result.results[0].success && result.results[0].id) {
      createdTaskIds.push(result.results[0].id);
    }
  });

  it('should maintain results at original indices', async () => {
    const name1 = `BatchAdd Test - Idx0 ${Date.now()}`;
    const name3 = `BatchAdd Test - Idx2 ${Date.now()}`;

    const result = await batchAddItems([
      { type: 'task', name: name1 },
      { type: 'task', name: 'Bad', parentTempId: 'missing' }, // Will fail
      { type: 'task', name: name3 }
    ]);

    expect(result.results).toHaveLength(3);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[2].success).toBe(true);

    // Track for cleanup
    if (result.results[0].success && result.results[0].id) {
      createdTaskIds.push(result.results[0].id);
    }
    if (result.results[2].success && result.results[2].id) {
      createdTaskIds.push(result.results[2].id);
    }
  });

  it('should return error for empty array', async () => {
    const result = await batchAddItems([]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should handle three-level hierarchy', async () => {
    const gpName = `BatchAdd Test - GP ${Date.now()}`;
    const parentName = `BatchAdd Test - P ${Date.now()}`;
    const childName = `BatchAdd Test - C ${Date.now()}`;

    const result = await batchAddItems([
      { type: 'task', name: gpName, tempId: 'gp', hierarchyLevel: 0 },
      { type: 'task', name: parentName, tempId: 'parent', parentTempId: 'gp', hierarchyLevel: 1 },
      { type: 'task', name: childName, parentTempId: 'parent', hierarchyLevel: 2 }
    ]);

    expect(result.success).toBe(true);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(true);
    expect(result.results[2].success).toBe(true);

    // Track for cleanup
    result.results.forEach((r) => {
      if (r.success && r.id) createdTaskIds.push(r.id);
    });
  });
});
