import { afterEach, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { listFolders } from '../../../src/tools/primitives/listFolders.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('addFolder integration', () => {
  skipIfOmniFocusUnavailable();

  const createdFolderIds: string[] = [];

  afterEach(async () => {
    // Clean up folders in reverse order (children before parents)
    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFolderIds.length = 0;
  });

  it('should create folder at library root (default position)', async () => {
    const uniqueName = `AddFolder Test - Root ${Date.now()}`;

    const result = await addFolder({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      createdFolderIds.push(result.id);
      expect(result.name).toBe(uniqueName);
      expect(result.id).toBeTruthy();

      // Verify by listing
      await waitForSync();
      const listResult = await listFolders({});
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        const found = listResult.folders.find((f) => f.id === result.id);
        expect(found).toBeTruthy();
        expect(found?.name).toBe(uniqueName);
      }
    }
  });

  it('should create folder as child of test folder', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    const uniqueName = `AddFolder Test - Child ${Date.now()}`;

    const result = await addFolder({
      name: uniqueName,
      position: { placement: 'ending', relativeTo: testFolderId! }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdFolderIds.push(result.id);
      expect(result.name).toBe(uniqueName);

      // Verify parent relationship
      await waitForSync();
      const listResult = await listFolders({ parentId: testFolderId! });
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        const found = listResult.folders.find((f) => f.id === result.id);
        expect(found).toBeTruthy();
      }
    }
  });

  it('should create folder at beginning of parent', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create two folders - second at beginning should appear first
    const firstName = `AddFolder Test - First ${Date.now()}`;
    const secondName = `AddFolder Test - Second ${Date.now()}`;

    const first = await addFolder({
      name: firstName,
      position: { placement: 'ending', relativeTo: testFolderId! }
    });
    expect(first.success).toBe(true);
    if (first.success) createdFolderIds.push(first.id);

    const second = await addFolder({
      name: secondName,
      position: { placement: 'beginning', relativeTo: testFolderId! }
    });
    expect(second.success).toBe(true);
    if (second.success) createdFolderIds.push(second.id);

    // Verify order - second should be before first
    await waitForSync();
    const listResult = await listFolders({ parentId: testFolderId! });
    expect(listResult.success).toBe(true);
    if (listResult.success && first.success && second.success) {
      const folders = listResult.folders.filter((f) => f.id === first.id || f.id === second.id);
      expect(folders.length).toBe(2);
      // The folder created at 'beginning' should appear first in the list
      const secondIndex = folders.findIndex((f) => f.id === second.id);
      const firstIndex = folders.findIndex((f) => f.id === first.id);
      expect(secondIndex).toBeLessThan(firstIndex);
    }
  });

  it('should create folder before sibling', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create reference folder first
    const refName = `AddFolder Test - Reference ${Date.now()}`;
    const refResult = await addFolder({
      name: refName,
      position: { placement: 'ending', relativeTo: testFolderId! }
    });
    expect(refResult.success).toBe(true);
    if (refResult.success) createdFolderIds.push(refResult.id);

    // Create folder before reference
    const beforeName = `AddFolder Test - Before ${Date.now()}`;
    const beforeResult = await addFolder({
      name: beforeName,
      position: { placement: 'before', relativeTo: refResult.success ? refResult.id : '' }
    });
    expect(beforeResult.success).toBe(true);
    if (beforeResult.success) createdFolderIds.push(beforeResult.id);
  });

  it('should create folder after sibling', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();

    // Create reference folder first
    const refName = `AddFolder Test - Reference After ${Date.now()}`;
    const refResult = await addFolder({
      name: refName,
      position: { placement: 'ending', relativeTo: testFolderId! }
    });
    expect(refResult.success).toBe(true);
    if (refResult.success) createdFolderIds.push(refResult.id);

    // Create folder after reference
    const afterName = `AddFolder Test - After ${Date.now()}`;
    const afterResult = await addFolder({
      name: afterName,
      position: { placement: 'after', relativeTo: refResult.success ? refResult.id : '' }
    });
    expect(afterResult.success).toBe(true);
    if (afterResult.success) createdFolderIds.push(afterResult.id);
  });

  it('should return error for non-existent relativeTo ID', async () => {
    const result = await addFolder({
      name: 'AddFolder Test - Bad Parent',
      position: { placement: 'ending', relativeTo: 'nonexistent-folder-id-12345' }
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should handle folder name with special characters', async () => {
    const uniqueName = `AddFolder Test - Special !@#$% ${Date.now()}`;

    const result = await addFolder({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      createdFolderIds.push(result.id);
      expect(result.name).toBe(uniqueName);
    }
  });
});
