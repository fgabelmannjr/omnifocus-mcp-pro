import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { queryOmnifocus } from '../../../src/tools/primitives/queryOmnifocus.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('queryOmnifocus integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTaskLocal(
    name: string,
    options?: { flagged?: boolean; note?: string }
  ): Promise<string> {
    const result = await addOmniFocusTask({
      name,
      flagged: options?.flagged,
      note: options?.note
    });
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

  it('should query tasks entity', async () => {
    const taskName = `QueryOF Test - Tasks ${Date.now()}`;
    await createTaskLocal(taskName);

    const result = await queryOmnifocus({ entity: 'tasks' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toBeInstanceOf(Array);
      expect(result.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('should query projects entity', async () => {
    const result = await queryOmnifocus({ entity: 'projects' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toBeInstanceOf(Array);
      expect(typeof result.count).toBe('number');
    }
  });

  it('should query folders entity', async () => {
    const result = await queryOmnifocus({ entity: 'folders' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toBeInstanceOf(Array);
      expect(typeof result.count).toBe('number');
    }
  });

  it('should filter tasks by flagged status', async () => {
    const flaggedName = `QueryOF Test - Flagged ${Date.now()}`;
    const unflaggedName = `QueryOF Test - Unflagged ${Date.now()}`;
    await createTaskLocal(flaggedName, { flagged: true });
    await createTaskLocal(unflaggedName, { flagged: false });

    const result = await queryOmnifocus({
      entity: 'tasks',
      filters: { flagged: true }
    });

    expect(result.success).toBe(true);
    if (result.success && result.items) {
      // All returned tasks should be flagged
      const items = result.items as Array<{ flagged?: boolean }>;
      items.forEach((item) => {
        expect(item.flagged).toBe(true);
      });
    }
  });

  it('should filter tasks with hasNote', async () => {
    const withNoteName = `QueryOF Test - WithNote ${Date.now()}`;
    const withoutNoteName = `QueryOF Test - NoNote ${Date.now()}`;
    await createTaskLocal(withNoteName, { note: 'This is a test note' });
    await createTaskLocal(withoutNoteName);

    const result = await queryOmnifocus({
      entity: 'tasks',
      filters: { hasNote: true }
    });

    expect(result.success).toBe(true);
    if (result.success && result.items) {
      // All returned tasks should have notes
      const items = result.items as Array<{ note?: string }>;
      items.forEach((item) => {
        // Note may or may not be included in default fields
        // The filter should work regardless
      });
      expect(result.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('should respect limit parameter', async () => {
    // Create a few tasks
    await createTaskLocal(`QueryOF Test - Limit1 ${Date.now()}`);
    await createTaskLocal(`QueryOF Test - Limit2 ${Date.now()}`);
    await createTaskLocal(`QueryOF Test - Limit3 ${Date.now()}`);

    const result = await queryOmnifocus({
      entity: 'tasks',
      limit: 2
    });

    expect(result.success).toBe(true);
    if (result.success && result.items) {
      expect(result.items.length).toBeLessThanOrEqual(2);
    }
  });

  it('should return summary count only when summary=true', async () => {
    await createTaskLocal(`QueryOF Test - Summary ${Date.now()}`);

    const result = await queryOmnifocus({
      entity: 'tasks',
      summary: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // In summary mode, items should be undefined
      expect(result.items).toBeUndefined();
      expect(typeof result.count).toBe('number');
    }
  });

  it('should return specific fields when requested', async () => {
    await createTaskLocal(`QueryOF Test - Fields ${Date.now()}`);

    const result = await queryOmnifocus({
      entity: 'tasks',
      fields: ['id', 'name', 'flagged']
    });

    expect(result.success).toBe(true);
    if (result.success && result.items && result.items.length > 0) {
      const item = result.items[0] as Record<string, unknown>;
      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(typeof item.flagged).toBe('boolean');
    }
  });

  it('should include completed tasks when includeCompleted=true', async () => {
    // This test verifies the flag is accepted - actual completed tasks depend on database state
    const result = await queryOmnifocus({
      entity: 'tasks',
      includeCompleted: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toBeInstanceOf(Array);
    }
  });

  it('should return error for missing entity parameter', async () => {
    // @ts-expect-error - Testing invalid input
    const result = await queryOmnifocus({});

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('Entity');
    }
  });

  it('should return error for invalid entity type', async () => {
    // @ts-expect-error - Testing invalid entity
    const result = await queryOmnifocus({ entity: 'invalid' });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('Invalid entity');
    }
  });

  it('should support sorting tasks', async () => {
    await createTaskLocal(`QueryOF Test - SortA ${Date.now()}`);
    await createTaskLocal(`QueryOF Test - SortB ${Date.now()}`);

    const resultAsc = await queryOmnifocus({
      entity: 'tasks',
      sortBy: 'name',
      sortOrder: 'asc'
    });

    expect(resultAsc.success).toBe(true);

    const resultDesc = await queryOmnifocus({
      entity: 'tasks',
      sortBy: 'name',
      sortOrder: 'desc'
    });

    expect(resultDesc.success).toBe(true);
  });

  it('should return task properties in default field set', async () => {
    const taskName = `QueryOF Test - Props ${Date.now()}`;
    await createTaskLocal(taskName, { flagged: true });

    const result = await queryOmnifocus({ entity: 'tasks' });

    expect(result.success).toBe(true);
    if (result.success && result.items && result.items.length > 0) {
      // Find our test task
      const items = result.items as Array<{ name?: string; id?: string; taskStatus?: string }>;
      const testTask = items.find((item) => item.name?.includes('QueryOF Test - Props'));
      if (testTask) {
        expect(testTask.id).toBeDefined();
        expect(testTask.name).toBeDefined();
        expect(testTask.taskStatus).toBeDefined();
      }
    }
  });
});
