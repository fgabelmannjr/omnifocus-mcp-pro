import { afterEach, describe, expect, it } from 'vitest';
import { editItem } from '../../../src/tools/primitives/editItem.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import {
  createTestTask,
  deleteTestTask,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('editItem integration (tasks)', () => {
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

  it('should rename task by ID', async () => {
    const originalName = `EditItem Test - Original ${Date.now()}`;
    const taskId = await createTaskLocal(originalName);

    const newName = `EditItem Test - Renamed ${Date.now()}`;
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newName: newName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify the rename
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.name).toBe(newName);
      }
    }
  });

  it('should update task note', async () => {
    const taskName = `EditItem Test - Note ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const newNote = 'This is the updated note content.';
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newNote: newNote
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.note).toBe(newNote);
      }
    }
  });

  it('should mark task as completed', async () => {
    const taskName = `EditItem Test - Complete ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newStatus: 'completed'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.completed).toBe(true);
        expect(getResult.task.taskStatus).toBe('Completed');
      }
    }
  });

  it('should mark task as incomplete', async () => {
    const taskName = `EditItem Test - Incomplete ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // First complete it
    await editItem({ id: taskId, itemType: 'task', newStatus: 'completed' });
    await waitForSync();

    // Then mark incomplete
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newStatus: 'incomplete'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.completed).toBe(false);
      }
    }
  });

  it('should flag task', async () => {
    const taskName = `EditItem Test - Flag ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newFlagged: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.flagged).toBe(true);
      }
    }
  });

  it('should unflag task', async () => {
    const taskName = `EditItem Test - Unflag ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // First flag it
    await editItem({ id: taskId, itemType: 'task', newFlagged: true });
    await waitForSync();

    // Then unflag
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newFlagged: false
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.flagged).toBe(false);
      }
    }
  });

  it('should set due date', async () => {
    const taskName = `EditItem Test - DueDate ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString();

    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newDueDate: dueDate
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.dueDate).toBeTruthy();
      }
    }
  });

  it('should set defer date', async () => {
    const taskName = `EditItem Test - DeferDate ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const deferDate = nextWeek.toISOString();

    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newDeferDate: deferDate
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.deferDate).toBeTruthy();
      }
    }
  });

  it('should update multiple properties at once', async () => {
    const taskName = `EditItem Test - Multi ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const newName = `EditItem Test - Multi Updated ${Date.now()}`;
    const newNote = 'Updated note';
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newName: newName,
      newNote: newNote,
      newFlagged: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.name).toBe(newName);
        expect(getResult.task.note).toBe(newNote);
        expect(getResult.task.flagged).toBe(true);
      }
    }
  });

  it('should return error for non-existent task ID', async () => {
    const result = await editItem({
      id: 'nonexistent-task-id-12345',
      itemType: 'task',
      name: 'Should Not Work'
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('not found');
    }
  });

  it('should handle name with special characters', async () => {
    const taskName = `EditItem Test - ToSpecial ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const specialName = `EditItem Test - Special !@#$% ${Date.now()}`;
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newName: specialName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.name).toBe(specialName);
      }
    }
  });
});
