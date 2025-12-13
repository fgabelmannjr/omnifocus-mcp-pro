import { afterEach, describe, expect, it } from 'vitest';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import {
  createTestTask,
  deleteTestTask,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('getTask integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTaskLocal(name: string): Promise<string> {
    const id = await createTestTask(name);
    createdTaskIds.push(id);
    await waitForSync();
    return id;
  }

  afterEach(async () => {
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await deleteTestTask(id);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;
  });

  it('should get task by ID', async () => {
    const taskName = `GetTask Test - ByID ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await getTask({ id: taskId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.id).toBe(taskId);
      expect(result.task.name).toContain('GetTask Test');
    }
  });

  it('should get task by name', async () => {
    const taskName = `GetTask Test - ByName ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // Get full name (including prefix from helper)
    const fullName = `MCP Test Task - ${taskName}`;
    const result = await getTask({ name: fullName });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.task.id).toBe(taskId);
    }
  });

  it('should return full task properties', async () => {
    const taskName = `GetTask Test - Props ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await getTask({ id: taskId });

    expect(result.success).toBe(true);
    if (result.success) {
      const task = result.task;
      // Check all expected properties exist
      expect(task.id).toBeTruthy();
      expect(task.name).toBeTruthy();
      expect(typeof task.note).toBe('string');
      expect(typeof task.completed).toBe('boolean');
      expect(typeof task.flagged).toBe('boolean');
      expect(typeof task.effectiveFlagged).toBe('boolean');
      expect(typeof task.sequential).toBe('boolean');
      expect(typeof task.completedByChildren).toBe('boolean');
      expect(typeof task.hasChildren).toBe('boolean');
      expect(typeof task.inInbox).toBe('boolean');
      expect(task.taskStatus).toBeTruthy();
      expect(Array.isArray(task.tags)).toBe(true);
    }
  });

  it('should return error for non-existent task ID', async () => {
    const result = await getTask({ id: 'nonexistent-task-id-12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent task name', async () => {
    const result = await getTask({ name: 'This Task Does Not Exist At All 12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `GetTask Test - Duplicate ${Date.now()}`;
    const id1 = await createTaskLocal(duplicateName);
    const id2 = await createTaskLocal(duplicateName);

    // Get full name (including prefix from helper)
    const fullName = `MCP Test Task - ${duplicateName}`;
    const result = await getTask({ name: fullName });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }
  });

  it('should return task status correctly', async () => {
    const taskName = `GetTask Test - Status ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await getTask({ id: taskId });

    expect(result.success).toBe(true);
    if (result.success) {
      // Task should have a valid status
      const validStatuses = [
        'Available',
        'Blocked',
        'Completed',
        'Dropped',
        'DueSoon',
        'Next',
        'Overdue'
      ];
      expect(validStatuses).toContain(result.task.taskStatus);
    }
  });

  it('should return dates as ISO strings or null', async () => {
    const taskName = `GetTask Test - Dates ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await getTask({ id: taskId });

    expect(result.success).toBe(true);
    if (result.success) {
      const task = result.task;
      // Dates should be null (not set) or valid ISO strings
      if (task.dueDate !== null) {
        expect(new Date(task.dueDate).toISOString()).toBe(task.dueDate);
      }
      if (task.deferDate !== null) {
        expect(new Date(task.deferDate).toISOString()).toBe(task.deferDate);
      }
      if (task.added !== null) {
        expect(new Date(task.added).toISOString()).toBe(task.added);
      }
    }
  });

  it('should return tags array', async () => {
    const taskName = `GetTask Test - Tags ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await getTask({ id: taskId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.task.tags)).toBe(true);
      // For a new task without tags, should be empty array
      expect(result.task.tags.length).toBe(0);
    }
  });
});
