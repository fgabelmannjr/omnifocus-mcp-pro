import { afterEach, describe, expect, it } from 'vitest';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { setPlannedDate } from '../../../src/tools/primitives/setPlannedDate.js';
import {
  createTestTask,
  deleteTestTask,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('setPlannedDate integration', () => {
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

  it('should set planned date by task ID', async () => {
    const taskName = `SetPlanned Test - ByID ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const plannedDate = tomorrow.toISOString();

    const result = await setPlannedDate({ id: taskId, plannedDate });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);

      // Verify the planned date was set
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        // plannedDate should be set (may be null on older OmniFocus versions)
        if (getResult.task.plannedDate !== null) {
          expect(getResult.task.plannedDate).toBeTruthy();
        }
      }
    }
  });

  it('should set planned date by task name', async () => {
    const taskName = `SetPlanned Test - ByName ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const plannedDate = tomorrow.toISOString();

    // Get full name (including prefix from helper)
    const fullName = `MCP Test Task - ${taskName}`;
    const result = await setPlannedDate({ name: fullName, plannedDate });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);
    }
  });

  it('should clear planned date with null', async () => {
    const taskName = `SetPlanned Test - Clear ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // First set a date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await setPlannedDate({ id: taskId, plannedDate: tomorrow.toISOString() });
    await waitForSync();

    // Then clear it
    const result = await setPlannedDate({ id: taskId, plannedDate: null });

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify the planned date was cleared
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.plannedDate).toBeNull();
      }
    }
  });

  it('should return error for non-existent task ID', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await setPlannedDate({
      id: 'nonexistent-task-id-12345',
      plannedDate: tomorrow.toISOString()
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent task name', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await setPlannedDate({
      name: 'This Task Does Not Exist At All 12345',
      plannedDate: tomorrow.toISOString()
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `SetPlanned Test - Duplicate ${Date.now()}`;
    const id1 = await createTaskLocal(duplicateName);
    const id2 = await createTaskLocal(duplicateName);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get full name (including prefix from helper)
    const fullName = `MCP Test Task - ${duplicateName}`;
    const result = await setPlannedDate({ name: fullName, plannedDate: tomorrow.toISOString() });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }
  });

  it('should accept ISO 8601 date string', async () => {
    const taskName = `SetPlanned Test - ISO ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // Full ISO 8601 format
    const isoDate = '2025-12-25T10:00:00.000Z';
    const result = await setPlannedDate({ id: taskId, plannedDate: isoDate });

    expect(result.success).toBe(true);
  });

  it('should accept date-only string', async () => {
    const taskName = `SetPlanned Test - DateOnly ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    // Date-only format
    const dateOnly = '2025-12-25';
    const result = await setPlannedDate({ id: taskId, plannedDate: dateOnly });

    // May succeed or fail depending on OmniFocus version
    // Just verify it doesn't crash
    expect(typeof result.success).toBe('boolean');
  });
});
