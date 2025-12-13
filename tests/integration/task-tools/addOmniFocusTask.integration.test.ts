import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('addOmniFocusTask integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

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

  it('should create task in inbox', async () => {
    const uniqueName = `AddTask Test - Inbox ${Date.now()}`;

    const result = await addOmniFocusTask({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);
      expect(result.taskId).toBeTruthy();
      expect(result.placement).toBe('inbox');

      // Verify by getting task
      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.name).toBe(uniqueName);
        expect(getResult.task.inInbox).toBe(true);
      }
    }
  });

  it('should create task with note', async () => {
    const uniqueName = `AddTask Test - Note ${Date.now()}`;
    const noteContent = 'This is a test note with some content.';

    const result = await addOmniFocusTask({ name: uniqueName, note: noteContent });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);

      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.note).toBe(noteContent);
      }
    }
  });

  it('should create task with due date', async () => {
    const uniqueName = `AddTask Test - Due ${Date.now()}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const result = await addOmniFocusTask({ name: uniqueName, dueDate });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);

      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.dueDate).toBeTruthy();
      }
    }
  });

  it('should create task with defer date', async () => {
    const uniqueName = `AddTask Test - Defer ${Date.now()}`;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const deferDate = nextWeek.toISOString().split('T')[0];

    const result = await addOmniFocusTask({ name: uniqueName, deferDate });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);

      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.deferDate).toBeTruthy();
      }
    }
  });

  it('should create flagged task', async () => {
    const uniqueName = `AddTask Test - Flagged ${Date.now()}`;

    const result = await addOmniFocusTask({ name: uniqueName, flagged: true });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);

      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.flagged).toBe(true);
      }
    }
  });

  it('should create task with estimated minutes', async () => {
    const uniqueName = `AddTask Test - Estimate ${Date.now()}`;

    const result = await addOmniFocusTask({ name: uniqueName, estimatedMinutes: 30 });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);

      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.estimatedMinutes).toBe(30);
      }
    }
  });

  it('should return error for empty name', async () => {
    const result = await addOmniFocusTask({ name: '' });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('required');
    }
  });

  it('should return error for non-existent project', async () => {
    const result = await addOmniFocusTask({
      name: 'Task for Bad Project',
      projectName: 'NonExistent Project 12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('not found');
    }
  });

  it('should handle task name with special characters', async () => {
    const uniqueName = `AddTask Test - Special !@#$% ${Date.now()}`;

    const result = await addOmniFocusTask({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success && result.taskId) {
      createdTaskIds.push(result.taskId);

      await waitForSync();
      const getResult = await getTask({ id: result.taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.name).toBe(uniqueName);
      }
    }
  });
});
