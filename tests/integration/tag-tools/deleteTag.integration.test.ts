import { afterEach, describe, expect, it } from 'vitest';
import { createTag } from '../../../src/tools/primitives/createTag.js';
import { deleteTag } from '../../../src/tools/primitives/deleteTag.js';
import { listTags } from '../../../src/tools/primitives/listTags.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('deleteTag integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTagIds: string[] = [];

  async function createTestTag(name: string, parentId?: string): Promise<string> {
    const result = await createTag({
      name,
      ...(parentId && { parentId })
    });

    if (result.success) {
      createdTagIds.push(result.id);
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test tag: ${JSON.stringify(result)}`);
  }

  afterEach(async () => {
    // Clean up in reverse order (children before parents)
    for (const id of [...createdTagIds].reverse()) {
      try {
        await deleteTag({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTagIds.length = 0;
  });

  it('should delete tag by ID', async () => {
    const tagName = `DeleteTag Test - ByID ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    const result = await deleteTag({ id: tagId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(tagId);
      expect(result.name).toBe(tagName);
    }

    // Verify deletion
    await waitForSync();
    const listResult = await listTags({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.tags.find((t) => t.id === tagId);
      expect(found).toBeUndefined();
    }

    // Remove from cleanup list since already deleted
    const index = createdTagIds.indexOf(tagId);
    if (index > -1) createdTagIds.splice(index, 1);
  });

  it('should delete tag by name', async () => {
    const tagName = `DeleteTag Test - ByName ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    const result = await deleteTag({ name: tagName });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(tagId);
      expect(result.name).toBe(tagName);
    }

    // Remove from cleanup list since already deleted
    const index = createdTagIds.indexOf(tagId);
    if (index > -1) createdTagIds.splice(index, 1);
  });

  it('should delete parent tag and promote children to root', async () => {
    const parentName = `DeleteTag Test - Parent ${Date.now()}`;
    const parentId = await createTestTag(parentName);

    const childName = `DeleteTag Test - Child ${Date.now()}`;
    const childId = await createTestTag(childName, parentId);

    // Delete parent
    const result = await deleteTag({ id: parentId });

    expect(result.success).toBe(true);

    // Verify parent is deleted and child is promoted to root level
    // Note: OmniFocus promotes orphaned children to root, not cascade delete
    await waitForSync();
    const listResult = await listTags({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const parentFound = listResult.tags.find((t) => t.id === parentId);
      const childFound = listResult.tags.find((t) => t.id === childId);
      expect(parentFound).toBeUndefined();
      // Child should still exist but be promoted to root (parentId = null)
      expect(childFound).toBeTruthy();
      expect(childFound?.parentId).toBeNull();
    }

    // Remove parent from cleanup list (already deleted), keep child for cleanup
    const parentIndex = createdTagIds.indexOf(parentId);
    if (parentIndex > -1) createdTagIds.splice(parentIndex, 1);
  });

  it('should return error for non-existent tag ID', async () => {
    const result = await deleteTag({
      id: 'nonexistent-tag-id-12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent tag name', async () => {
    const result = await deleteTag({
      name: 'This Tag Does Not Exist At All 12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `DeleteTag Test - Duplicate ${Date.now()}`;
    const id1 = await createTestTag(duplicateName);
    const id2 = await createTestTag(duplicateName);

    const result = await deleteTag({ name: duplicateName });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }
  });

  it('should delete leaf child tag without affecting parent', async () => {
    const parentName = `DeleteTag Test - ParentPreserve ${Date.now()}`;
    const parentId = await createTestTag(parentName);

    const childName = `DeleteTag Test - ChildDelete ${Date.now()}`;
    const childId = await createTestTag(childName, parentId);

    // Delete child only
    const result = await deleteTag({ id: childId });

    expect(result.success).toBe(true);

    // Verify parent still exists
    await waitForSync();
    const listResult = await listTags({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const parentFound = listResult.tags.find((t) => t.id === parentId);
      const childFound = listResult.tags.find((t) => t.id === childId);
      expect(parentFound).toBeTruthy();
      expect(childFound).toBeUndefined();
    }

    // Remove child from cleanup list
    const index = createdTagIds.indexOf(childId);
    if (index > -1) createdTagIds.splice(index, 1);
  });

  it('should handle tag name with special characters', async () => {
    const tagName = `DeleteTag Test - Special !@#$% ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    const result = await deleteTag({ id: tagId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.name).toBe(tagName);
    }

    // Remove from cleanup list
    const index = createdTagIds.indexOf(tagId);
    if (index > -1) createdTagIds.splice(index, 1);
  });
});
