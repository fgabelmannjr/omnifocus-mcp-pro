import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { editItem } from '../../../src/tools/primitives/editItem.js';
import { listTasks } from '../../../src/tools/primitives/listTasks.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('listTasks integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTaskLocal(name: string, options?: object): Promise<string> {
    const result = await addOmniFocusTask({ name, ...options });
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

  it('should list all available tasks', async () => {
    const taskName = `ListTasks Test - All ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await listTasks({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks).toBeInstanceOf(Array);
      const found = result.tasks.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
    }
  });

  it('should filter by flagged status', async () => {
    const flaggedName = `ListTasks Test - Flagged ${Date.now()}`;
    const flaggedId = await createTaskLocal(flaggedName, { flagged: true });

    const unflaggedName = `ListTasks Test - Unflagged ${Date.now()}`;
    await createTaskLocal(unflaggedName, { flagged: false });

    const result = await listTasks({ flagged: true });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.tasks.find((t) => t.id === flaggedId);
      expect(found).toBeTruthy();
      expect(found?.flagged).toBe(true);
    }
  });

  it('should include completed tasks when requested', async () => {
    const taskName = `ListTasks Test - Complete ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // Complete the task
    await editItem({ id: taskId, itemType: 'task', newStatus: 'completed' });
    await waitForSync();

    // Without includeCompleted, should not find it
    const excludeResult = await listTasks({ includeCompleted: false });
    expect(excludeResult.success).toBe(true);
    if (excludeResult.success) {
      const found = excludeResult.tasks.find((t) => t.id === taskId);
      expect(found).toBeUndefined();
    }

    // With includeCompleted, should find it
    const includeResult = await listTasks({ includeCompleted: true });
    expect(includeResult.success).toBe(true);
    if (includeResult.success) {
      const found = includeResult.tasks.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
    }
  });

  it('should filter by status values', async () => {
    const taskName = `ListTasks Test - Status ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await listTasks({ status: ['Available'] });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.tasks.find((t) => t.id === taskId);
      // New task should be Available
      expect(found).toBeTruthy();
      expect(found?.taskStatus).toBe('Available');
    }
  });

  it('should respect limit parameter', async () => {
    // Create multiple tasks
    const baseName = `ListTasks Test - Limit ${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await createTaskLocal(`${baseName} ${i}`);
    }

    const result = await listTasks({ limit: 3 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks.length).toBeLessThanOrEqual(3);
    }
  });

  it('should return task summary properties', async () => {
    const taskName = `ListTasks Test - Props ${Date.now()}`;
    const taskId = await createTaskLocal(taskName, { flagged: true });

    const result = await listTasks({});

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.tasks.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.id).toBe(taskId);
        expect(found.name).toContain('ListTasks Test');
        expect(typeof found.flagged).toBe('boolean');
        expect(found.taskStatus).toBeTruthy();
        expect(Array.isArray(found.tagIds)).toBe(true);
        expect(Array.isArray(found.tagNames)).toBe(true);
      }
    }
  });

  it('should filter by due date range', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const taskName = `ListTasks Test - DueRange ${Date.now()}`;
    const taskId = await createTaskLocal(taskName, { dueDate });

    // Find tasks due before end of week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const result = await listTasks({ dueBefore: nextWeek.toISOString() });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.tasks.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
    }
  });

  it('should handle empty result gracefully', async () => {
    // Search for tasks with impossible criteria
    const result = await listTasks({
      status: ['Completed'],
      includeCompleted: true,
      flagged: true,
      limit: 1000
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.tasks)).toBe(true);
    }
  });
});
