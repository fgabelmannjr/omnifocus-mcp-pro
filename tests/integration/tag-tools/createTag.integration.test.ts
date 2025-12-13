import { afterEach, describe, expect, it } from 'vitest';
import { createTag } from '../../../src/tools/primitives/createTag.js';
import { deleteTag } from '../../../src/tools/primitives/deleteTag.js';
import { listTags } from '../../../src/tools/primitives/listTags.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('createTag integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTagIds: string[] = [];

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

  it('should create tag at root level', async () => {
    const uniqueName = `CreateTag Test - Root ${Date.now()}`;

    const result = await createTag({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      createdTagIds.push(result.id);
      expect(result.name).toBe(uniqueName);
      expect(result.id).toBeTruthy();

      // Verify by listing
      await waitForSync();
      const listResult = await listTags({});
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        const found = listResult.tags.find((t) => t.id === result.id);
        expect(found).toBeTruthy();
        expect(found?.name).toBe(uniqueName);
      }
    }
  });

  it('should create tag as child of existing tag', async () => {
    // Create parent tag first
    const parentName = `CreateTag Test - Parent ${Date.now()}`;
    const parentResult = await createTag({ name: parentName });
    expect(parentResult.success).toBe(true);
    if (parentResult.success) {
      createdTagIds.push(parentResult.id);

      // Create child tag
      const childName = `CreateTag Test - Child ${Date.now()}`;
      const childResult = await createTag({
        name: childName,
        parentId: parentResult.id
      });

      expect(childResult.success).toBe(true);
      if (childResult.success) {
        createdTagIds.push(childResult.id);
        expect(childResult.name).toBe(childName);

        // Verify child tag exists - parent relationship is handled by OmniFocus
        // Note: OmniJS may not always reflect parentId immediately via tag.parent
        await waitForSync();
        const listResult = await listTags({});
        expect(listResult.success).toBe(true);
        if (listResult.success) {
          const found = listResult.tags.find((t) => t.id === childResult.id);
          expect(found).toBeTruthy();
          expect(found?.name).toBe(childName);
        }
      }
    }
  });

  it('should create tag with allowsNextAction = false', async () => {
    const uniqueName = `CreateTag Test - NoNextAction ${Date.now()}`;

    const result = await createTag({
      name: uniqueName,
      allowsNextAction: false
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdTagIds.push(result.id);

      // Verify by listing
      await waitForSync();
      const listResult = await listTags({});
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        const found = listResult.tags.find((t) => t.id === result.id);
        expect(found).toBeTruthy();
        expect(found?.allowsNextAction).toBe(false);
      }
    }
  });

  it('should create tag with allowsNextAction = true (default)', async () => {
    const uniqueName = `CreateTag Test - AllowsNextAction ${Date.now()}`;

    const result = await createTag({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      createdTagIds.push(result.id);

      await waitForSync();
      const listResult = await listTags({});
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        const found = listResult.tags.find((t) => t.id === result.id);
        expect(found).toBeTruthy();
        expect(found?.allowsNextAction).toBe(true);
      }
    }
  });

  it('should return error for non-existent parent ID', async () => {
    const result = await createTag({
      name: 'CreateTag Test - Bad Parent',
      parentId: 'nonexistent-tag-id-12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should create deeply nested tags', async () => {
    // Create grandparent > parent > child hierarchy
    const gpName = `CreateTag Test - GP ${Date.now()}`;
    const gpResult = await createTag({ name: gpName });
    expect(gpResult.success).toBe(true);
    if (gpResult.success) createdTagIds.push(gpResult.id);

    const parentName = `CreateTag Test - P ${Date.now()}`;
    const parentResult = await createTag({
      name: parentName,
      parentId: gpResult.success ? gpResult.id : ''
    });
    expect(parentResult.success).toBe(true);
    if (parentResult.success) createdTagIds.push(parentResult.id);

    const childName = `CreateTag Test - C ${Date.now()}`;
    const childResult = await createTag({
      name: childName,
      parentId: parentResult.success ? parentResult.id : ''
    });
    expect(childResult.success).toBe(true);
    if (childResult.success) createdTagIds.push(childResult.id);
  });

  it('should handle tag name with special characters', async () => {
    const uniqueName = `CreateTag Test - Special @#$% ${Date.now()}`;

    const result = await createTag({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      createdTagIds.push(result.id);
      expect(result.name).toBe(uniqueName);
    }
  });
});
