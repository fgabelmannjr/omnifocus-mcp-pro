import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { appendNote } from '../../../src/tools/primitives/appendNote.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('appendNote integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTaskLocal(name: string, note?: string): Promise<string> {
    const result = await addOmniFocusTask({ name, ...(note && { note }) });
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

  it('should append text to empty note by task ID', async () => {
    const taskName = `AppendNote Test - Empty ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const textToAppend = 'This is the appended note text.';
    const result = await appendNote({ id: taskId, text: textToAppend });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);

      // Verify the note was appended
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.note).toContain(textToAppend);
      }
    }
  });

  it('should append text to existing note', async () => {
    const taskName = `AppendNote Test - Existing ${Date.now()}`;
    const originalNote = 'Original note content.';
    const taskId = await createTaskLocal(taskName, originalNote);

    const textToAppend = 'Additional appended text.';
    const result = await appendNote({ id: taskId, text: textToAppend });

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify both original and appended text exist
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.note).toContain(originalNote);
        expect(getResult.task.note).toContain(textToAppend);
      }
    }
  });

  it('should append by task name', async () => {
    const taskName = `AppendNote Test - ByName ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const textToAppend = 'Appended by name lookup.';
    const result = await appendNote({ name: taskName, text: textToAppend });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);
    }
  });

  it('should append multiple times', async () => {
    const taskName = `AppendNote Test - Multiple ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const text1 = 'First append.';
    const text2 = 'Second append.';
    const text3 = 'Third append.';

    await appendNote({ id: taskId, text: text1 });
    await appendNote({ id: taskId, text: text2 });
    await appendNote({ id: taskId, text: text3 });

    await waitForSync();
    const getResult = await getTask({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.task.note).toContain(text1);
      expect(getResult.task.note).toContain(text2);
      expect(getResult.task.note).toContain(text3);
    }
  });

  it('should return error for non-existent task ID', async () => {
    const result = await appendNote({
      id: 'nonexistent-task-id-12345',
      text: 'Should not work'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent task name', async () => {
    const result = await appendNote({
      name: 'This Task Does Not Exist At All 12345',
      text: 'Should not work'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `AppendNote Test - Duplicate ${Date.now()}`;
    const id1 = await createTaskLocal(duplicateName);
    const id2 = await createTaskLocal(duplicateName);

    const result = await appendNote({ name: duplicateName, text: 'Should trigger disambiguation' });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }
  });

  it('should handle text with special characters', async () => {
    const taskName = `AppendNote Test - Special ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const specialText = 'Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./ and newlines\n\nhere';
    const result = await appendNote({ id: taskId, text: specialText });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.note).toContain('Special chars:');
      }
    }
  });

  it('should handle empty text gracefully', async () => {
    const taskName = `AppendNote Test - Empty Text ${Date.now()}`;
    const taskId = await createTaskLocal(taskName);

    const result = await appendNote({ id: taskId, text: '' });

    // Empty text append should succeed (no-op)
    expect(result.success).toBe(true);
  });
});
