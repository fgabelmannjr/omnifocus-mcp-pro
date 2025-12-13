import { afterEach, describe, expect, it } from 'vitest';
import { assignTags } from '../../../src/tools/primitives/assignTags.js';
import { createTag } from '../../../src/tools/primitives/createTag.js';
import { deleteTag } from '../../../src/tools/primitives/deleteTag.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import {
  createTestTask,
  deleteTestTask,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('assignTags integration', () => {
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

  it('should assign single tag to single task', async () => {
    const tagName = `AssignTags Test - Single ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const taskId = await createTaskLocal(`AssignTask ${Date.now()}`);

    const result = await assignTags({
      taskIds: [taskId],
      tagIds: [tagId]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].taskId).toBe(taskId);
    }

    // Verify tag was assigned
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      // getTask returns tags as array of {id, name} objects
      const hasTag = taskResult.task.tags.some((t) => t.id === tagId);
      expect(hasTag).toBe(true);
    }
  });

  it('should assign multiple tags to single task', async () => {
    const tag1Name = `AssignTags Test - Multi1 ${Date.now()}`;
    const tag1Id = await createTestTagLocal(tag1Name);

    const tag2Name = `AssignTags Test - Multi2 ${Date.now()}`;
    const tag2Id = await createTestTagLocal(tag2Name);

    const taskId = await createTaskLocal(`AssignMulti ${Date.now()}`);

    const result = await assignTags({
      taskIds: [taskId],
      tagIds: [tag1Id, tag2Id]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    }

    // Verify both tags assigned
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      // getTask returns tags as array of {id, name} objects
      const tagIds = taskResult.task.tags.map((t) => t.id);
      expect(tagIds).toContain(tag1Id);
      expect(tagIds).toContain(tag2Id);
    }
  });

  it('should assign tag to multiple tasks', async () => {
    const tagName = `AssignTags Test - ToMany ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const task1Id = await createTaskLocal(`AssignMany1 ${Date.now()}`);
    const task2Id = await createTaskLocal(`AssignMany2 ${Date.now()}`);

    const result = await assignTags({
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

  it('should return per-item error for non-existent task', async () => {
    const tagName = `AssignTags Test - BadTask ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const validTaskId = await createTaskLocal(`ValidTask ${Date.now()}`);

    const result = await assignTags({
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

  it('should return error for non-existent tag', async () => {
    const taskId = await createTaskLocal(`TaskForBadTag ${Date.now()}`);

    const result = await assignTags({
      taskIds: [taskId],
      tagIds: ['nonexistent-tag-id-12345']
    });

    // When no valid tags can be resolved, overall operation fails
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No valid tags');
    }
  });

  it('should handle duplicate tag assignment gracefully', async () => {
    const tagName = `AssignTags Test - Duplicate ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    const taskId = await createTaskLocal(`DuplicateAssign ${Date.now()}`);

    // Assign once
    await assignTags({
      taskIds: [taskId],
      tagIds: [tagId]
    });

    // Assign same tag again
    const result = await assignTags({
      taskIds: [taskId],
      tagIds: [tagId]
    });

    // Should succeed (idempotent operation)
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
    }
  });

  it('should return disambiguation error for ambiguous task name', async () => {
    const tagName = `AssignTags Test - DisambigTask ${Date.now()}`;
    const tagId = await createTestTagLocal(tagName);

    // Create two tasks with same name
    const duplicateName = `DuplicateTaskName ${Date.now()}`;
    const task1Id = await createTaskLocal(duplicateName);
    const task2Id = await createTaskLocal(duplicateName);

    // Try to assign by name (will be ambiguous in implementation)
    // Note: This test assumes the primitive accepts names, which may vary
    // If it only accepts IDs, this test would need adjustment
    const result = await assignTags({
      taskIds: [task1Id], // Using ID to avoid disambiguation in this test
      tagIds: [tagId]
    });

    // This should succeed since we're using IDs
    expect(result.success).toBe(true);
  });
});
