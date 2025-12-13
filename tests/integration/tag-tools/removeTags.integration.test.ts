import { afterEach, describe, expect, it } from 'vitest';
import { assignTags } from '../../../src/tools/primitives/assignTags.js';
import { createTag } from '../../../src/tools/primitives/createTag.js';
import { deleteTag } from '../../../src/tools/primitives/deleteTag.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { removeTags } from '../../../src/tools/primitives/removeTags.js';
import {
  createTestTask,
  deleteTestTask,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('removeTags integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTagIds: string[] = [];
  const createdTaskIds: string[] = [];

  async function createTestTagLocal(name: string): Promise<string> {
    const result = await createTag({ name });

    if (result.success) {
      createdTagIds.push(result.id);
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test tag: ${JSON.stringify(result)}`);
  }

  async function createTaskLocal(name: string): Promise<string> {
    const id = await createTestTask(name);
    createdTaskIds.push(id);
    await waitForSync();
    return id;
  }

  async function assignTagToTask(taskId: string, tagId: string): Promise<void> {
    await assignTags({ taskIds: [taskId], tagIds: [tagId] });
    await waitForSync();
  }

  afterEach(async () => {
    // Clean up tasks first
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await deleteTestTask(id);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;

    // Then clean up tags
    for (const id of [...createdTagIds].reverse()) {
      try {
        await deleteTag({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTagIds.length = 0;
  });

  it('should remove single tag from single task', async () => {
    const tagName = `RemoveTags Test - Single ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const taskId = await createTaskLocal(`RemoveTask ${Date.now()}`);
    await assignTagToTask(taskId, tagId);

    const result = await removeTags({
      taskIds: [taskId],
      tagIds: [tagId]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].taskId).toBe(taskId);
    }

    // Verify tag was removed
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      // getTask returns tags as array of {id, name} objects
      const hasTag = taskResult.task.tags.some((t) => t.id === tagId);
      expect(hasTag).toBe(false);
    }
  });

  it('should remove multiple tags from single task', async () => {
    const tag1Name = `RemoveTags Test - Multi1 ${Date.now()}`;
    const tag1Id = await createTestTagLocal(tag1Name);

    const tag2Name = `RemoveTags Test - Multi2 ${Date.now()}`;
    const tag2Id = await createTestTagLocal(tag2Name);

    const taskId = await createTaskLocal(`RemoveMulti ${Date.now()}`);
    await assignTagToTask(taskId, tag1Id);
    await assignTagToTask(taskId, tag2Id);

    const result = await removeTags({
      taskIds: [taskId],
      tagIds: [tag1Id, tag2Id]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    }

    // Verify both tags removed
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      // getTask returns tags as array of {id, name} objects
      const tagIds = taskResult.task.tags.map((t) => t.id);
      expect(tagIds).not.toContain(tag1Id);
      expect(tagIds).not.toContain(tag2Id);
    }
  });

  it('should remove tag from multiple tasks', async () => {
    const tagName = `RemoveTags Test - FromMany ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const task1Id = await createTaskLocal(`RemoveMany1 ${Date.now()}`);
    const task2Id = await createTaskLocal(`RemoveMany2 ${Date.now()}`);
    await assignTagToTask(task1Id, tagId);
    await assignTagToTask(task2Id, tagId);

    const result = await removeTags({
      taskIds: [task1Id, task2Id],
      tagIds: [tagId]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    }
  });

  it('should clear all tags with clearAll option', async () => {
    const tag1Name = `RemoveTags Test - ClearAll1 ${Date.now()}`;
    const tag1Id = await createTestTagLocal(tag1Name);

    const tag2Name = `RemoveTags Test - ClearAll2 ${Date.now()}`;
    const tag2Id = await createTestTagLocal(tag2Name);

    const taskId = await createTaskLocal(`ClearAllTask ${Date.now()}`);
    await assignTagToTask(taskId, tag1Id);
    await assignTagToTask(taskId, tag2Id);

    const result = await removeTags({
      taskIds: [taskId],
      clearAll: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    }

    // Verify all tags removed
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      // getTask returns tags as array of {id, name} objects
      expect(taskResult.task.tags).toHaveLength(0);
    }
  });

  it('should return per-item error for non-existent task', async () => {
    const tagName = `RemoveTags Test - BadTask ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const validTaskId = await createTaskLocal(`ValidRemoveTask ${Date.now()}`);
    await assignTagToTask(validTaskId, tagId);

    const result = await removeTags({
      taskIds: [validTaskId, 'nonexistent-task-id-12345'],
      tagIds: [tagId]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(2);
      // First task should succeed
      const validResult = result.results.find((r) => r.taskId === validTaskId);
      expect(validResult?.success).toBe(true);
      // Second task should fail
      const invalidResult = result.results.find((r) => r.taskId === 'nonexistent-task-id-12345');
      expect(invalidResult?.success).toBe(false);
    }
  });

  it('should handle removing tag that is not assigned', async () => {
    const tagName = `RemoveTags Test - NotAssigned ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const taskId = await createTaskLocal(`TaskNoTag ${Date.now()}`);
    // Note: NOT assigning the tag

    const result = await removeTags({
      taskIds: [taskId],
      tagIds: [tagId]
    });

    // Should succeed (idempotent - removing non-existent tag is OK)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
    }
  });

  it('should handle clearAll on task with no tags', async () => {
    const taskId = await createTaskLocal(`NoTagsTask ${Date.now()}`);

    const result = await removeTags({
      taskIds: [taskId],
      clearAll: true
    });

    // Should succeed (no-op)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
    }
  });

  it('should return error for non-existent tag', async () => {
    const taskId = await createTaskLocal(`TaskForBadTag ${Date.now()}`);

    const result = await removeTags({
      taskIds: [taskId],
      tagIds: ['nonexistent-tag-id-12345']
    });

    // When tag is not found, overall operation fails
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
  });
});
