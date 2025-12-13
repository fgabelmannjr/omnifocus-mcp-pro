import { afterEach, describe, expect, it } from 'vitest';
import { createTag } from '../../../src/tools/primitives/createTag.js';
import { deleteTag } from '../../../src/tools/primitives/deleteTag.js';
import { editTag } from '../../../src/tools/primitives/editTag.js';
import { listTags } from '../../../src/tools/primitives/listTags.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('editTag integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTagIds: string[] = [];

  async function createTestTag(name: string, parentId?: string): Promise<string> {
    const result = await createTag({ name, parentId });
    if (result.success) {
      createdTagIds.push(result.id);
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test tag: ${JSON.stringify(result)}`);
  }

  afterEach(async () => {
    for (const id of [...createdTagIds].reverse()) {
      try {
        await deleteTag({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTagIds.length = 0;
  });

  it('should edit tag name by ID', async () => {
    const originalName = `EditTag Test - Original ${Date.now()}`;
    const tagId = await createTestTag(originalName);

    const newName = `EditTag Test - Renamed ${Date.now()}`;
    const result = await editTag({
      id: tagId,
      newName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(tagId);
      expect(result.name).toBe(newName);
    }

    // Verify by listing
    await waitForSync();
    const listResult = await listTags({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.tags.find((t) => t.id === tagId);
      expect(found?.name).toBe(newName);
    }
  });

  it('should edit tag name by name lookup', async () => {
    const originalName = `EditTag Test - ByName ${Date.now()}`;
    const tagId = await createTestTag(originalName);

    const newName = `EditTag Test - ByName Renamed ${Date.now()}`;
    const result = await editTag({
      name: originalName,
      newName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(tagId);
      expect(result.name).toBe(newName);
    }
  });

  it('should change tag status to onHold', async () => {
    const tagName = `EditTag Test - OnHold ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    const result = await editTag({
      id: tagId,
      status: 'onHold'
    });

    expect(result.success).toBe(true);

    // Verify status change
    await waitForSync();
    const listResult = await listTags({ status: 'onHold' });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.tags.find((t) => t.id === tagId);
      expect(found).toBeTruthy();
      expect(found?.status).toBe('onHold');
    }
  });

  it('should change tag status to dropped', async () => {
    const tagName = `EditTag Test - Dropped ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    const result = await editTag({
      id: tagId,
      status: 'dropped'
    });

    expect(result.success).toBe(true);

    await waitForSync();
    const listResult = await listTags({ status: 'dropped' });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.tags.find((t) => t.id === tagId);
      expect(found).toBeTruthy();
      expect(found?.status).toBe('dropped');
    }
  });

  it('should change tag status back to active', async () => {
    const tagName = `EditTag Test - Reactivate ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    // First drop it
    await editTag({ id: tagId, status: 'dropped' });
    await waitForSync();

    // Then reactivate
    const result = await editTag({
      id: tagId,
      status: 'active'
    });

    expect(result.success).toBe(true);

    await waitForSync();
    const listResult = await listTags({ status: 'active' });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.tags.find((t) => t.id === tagId);
      expect(found).toBeTruthy();
      expect(found?.status).toBe('active');
    }
  });

  it('should toggle allowsNextAction', async () => {
    const tagName = `EditTag Test - Toggle ${Date.now()}`;
    const tagId = await createTestTag(tagName);

    // Disable allowsNextAction
    const result = await editTag({
      id: tagId,
      allowsNextAction: false
    });

    expect(result.success).toBe(true);

    await waitForSync();
    const listResult = await listTags({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.tags.find((t) => t.id === tagId);
      expect(found?.allowsNextAction).toBe(false);
    }
  });

  it('should return error for non-existent tag ID', async () => {
    const result = await editTag({
      id: 'nonexistent-tag-id-12345',
      newName: 'Should Not Work'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `EditTag Test - Duplicate ${Date.now()}`;
    const id1 = await createTestTag(duplicateName);
    const id2 = await createTestTag(duplicateName);

    const result = await editTag({
      name: duplicateName,
      newName: 'Should Trigger Disambiguation'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }
  });
});
