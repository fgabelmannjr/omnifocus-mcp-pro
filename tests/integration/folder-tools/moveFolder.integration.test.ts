import { afterEach, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { listFolders } from '../../../src/tools/primitives/listFolders.js';
import { moveFolder } from '../../../src/tools/primitives/moveFolder.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('moveFolder integration', () => {
  skipIfOmniFocusUnavailable();

  const createdFolderIds: string[] = [];

  async function createTestFolder(name: string, parentId?: string): Promise<string> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');

    const result = await addFolder({
      name,
      position: { placement: 'ending', relativeTo: parentId || testFolderId }
    });

    if (result.success) {
      createdFolderIds.push(result.id);
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test folder: ${JSON.stringify(result)}`);
  }

  afterEach(async () => {
    // Clean up in reverse order (children first)
    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFolderIds.length = 0;
  });

  it('should move folder to different parent', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create source folder and target parent
    const sourceId = await createTestFolder(`MoveFolder Test - Source ${Date.now()}`);
    const targetParentId = await createTestFolder(`MoveFolder Test - Target Parent ${Date.now()}`);

    // Move source into target parent
    const result = await moveFolder({
      id: sourceId,
      position: { placement: 'ending', relativeTo: targetParentId }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(sourceId);
    }

    // Verify move by checking parent's children
    await waitForSync();
    const listResult = await listFolders({ parentId: targetParentId });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === sourceId);
      expect(found).toBeTruthy();
    }
  });

  it('should move folder by name lookup', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    const uniqueName = `MoveFolder Test - ByName ${Date.now()}`;
    const sourceId = await createTestFolder(uniqueName);
    const targetParentId = await createTestFolder(`MoveFolder Test - Target ${Date.now()}`);

    const result = await moveFolder({
      name: uniqueName,
      position: { placement: 'ending', relativeTo: targetParentId }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(sourceId);
    }
  });

  it('should move folder before sibling', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create two folders
    const firstId = await createTestFolder(`MoveFolder Test - First ${Date.now()}`);
    const secondId = await createTestFolder(`MoveFolder Test - Second ${Date.now()}`);

    // Move second before first
    const result = await moveFolder({
      id: secondId,
      position: { placement: 'before', relativeTo: firstId }
    });

    expect(result.success).toBe(true);

    // Verify order
    await waitForSync();
    const listResult = await listFolders({ parentId: testFolderId! });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const folders = listResult.folders.filter((f) => f.id === firstId || f.id === secondId);
      const secondIndex = folders.findIndex((f) => f.id === secondId);
      const firstIndex = folders.findIndex((f) => f.id === firstId);
      expect(secondIndex).toBeLessThan(firstIndex);
    }
  });

  it('should move folder after sibling', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create two folders, then a third
    const firstId = await createTestFolder(`MoveFolder Test - A ${Date.now()}`);
    const secondId = await createTestFolder(`MoveFolder Test - B ${Date.now()}`);
    const thirdId = await createTestFolder(`MoveFolder Test - C ${Date.now()}`);

    // Move first after second (so order becomes: second, first, third)
    const result = await moveFolder({
      id: firstId,
      position: { placement: 'after', relativeTo: secondId }
    });

    expect(result.success).toBe(true);
  });

  it('should prevent circular move (folder into itself)', async () => {
    const folderId = await createTestFolder(`MoveFolder Test - Self ${Date.now()}`);

    const result = await moveFolder({
      id: folderId,
      position: { placement: 'ending', relativeTo: folderId }
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error.toLowerCase()).toMatch(/circular|descendant|cannot move/i);
    }
  });

  it('should prevent circular move (folder into its descendant)', async () => {
    // Create hierarchy: parent > child > grandchild
    const parentId = await createTestFolder(`MoveFolder Test - Parent ${Date.now()}`);
    const childId = await createTestFolder(`MoveFolder Test - Child ${Date.now()}`, parentId);
    const grandchildId = await createTestFolder(
      `MoveFolder Test - Grandchild ${Date.now()}`,
      childId
    );

    // Try to move parent into grandchild (circular)
    const result = await moveFolder({
      id: parentId,
      position: { placement: 'ending', relativeTo: grandchildId }
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error.toLowerCase()).toMatch(/circular|descendant|cannot move/i);
    }
  });

  it('should return error for non-existent folder ID', async () => {
    const testFolderId = getTestFolderId();

    const result = await moveFolder({
      id: 'nonexistent-folder-id-12345',
      position: { placement: 'ending', relativeTo: testFolderId! }
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent relativeTo ID', async () => {
    const folderId = await createTestFolder(`MoveFolder Test - BadTarget ${Date.now()}`);

    const result = await moveFolder({
      id: folderId,
      position: { placement: 'ending', relativeTo: 'nonexistent-target-id-12345' }
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const testFolderId = getTestFolderId();
    const duplicateName = `MoveFolder Test - Duplicate ${Date.now()}`;

    const id1 = await createTestFolder(duplicateName);
    const id2 = await createTestFolder(duplicateName);

    const result = await moveFolder({
      name: duplicateName,
      position: { placement: 'ending', relativeTo: testFolderId! }
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }
  });

  it('should move folder to library root', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create folder inside test folder
    const folderId = await createTestFolder(`MoveFolder Test - ToRoot ${Date.now()}`);

    // Move to library root (null relativeTo with ending placement)
    const result = await moveFolder({
      id: folderId,
      position: { placement: 'ending', relativeTo: null }
    });

    expect(result.success).toBe(true);

    // Verify it's now at root level (not inside test folder)
    await waitForSync();
    const listResult = await listFolders({ parentId: testFolderId! });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      // Should NOT be in test folder anymore
      expect(found).toBeFalsy();
    }
  });
});
