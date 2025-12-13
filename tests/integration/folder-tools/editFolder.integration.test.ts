import { afterEach, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { editFolder } from '../../../src/tools/primitives/editFolder.js';
import { listFolders } from '../../../src/tools/primitives/listFolders.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('editFolder integration', () => {
  skipIfOmniFocusUnavailable();

  const createdFolderIds: string[] = [];

  async function createTestFolder(name: string): Promise<string> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');

    const result = await addFolder({
      name,
      position: { placement: 'ending', relativeTo: testFolderId }
    });

    if (result.success) {
      createdFolderIds.push(result.id);
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test folder: ${JSON.stringify(result)}`);
  }

  afterEach(async () => {
    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFolderIds.length = 0;
  });

  it('should edit folder name by ID', async () => {
    const originalName = `EditFolder Test - Original ${Date.now()}`;
    const folderId = await createTestFolder(originalName);

    const newName = `EditFolder Test - Renamed ${Date.now()}`;
    const result = await editFolder({
      id: folderId,
      newName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(folderId);
      expect(result.name).toBe(newName);
    }

    // Verify by listing
    await waitForSync();
    const listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found?.name).toBe(newName);
    }
  });

  it('should edit folder name by name lookup', async () => {
    const originalName = `EditFolder Test - ByName ${Date.now()}`;
    const folderId = await createTestFolder(originalName);

    const newName = `EditFolder Test - ByName Renamed ${Date.now()}`;
    const result = await editFolder({
      name: originalName,
      newName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(folderId);
      expect(result.name).toBe(newName);
    }
  });

  it('should change folder status to dropped', async () => {
    const folderName = `EditFolder Test - Status ${Date.now()}`;
    const folderId = await createTestFolder(folderName);

    const result = await editFolder({
      id: folderId,
      newStatus: 'dropped'
    });

    expect(result.success).toBe(true);

    // Verify status change
    await waitForSync();
    const listResult = await listFolders({ status: 'dropped' });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found).toBeTruthy();
      expect(found?.status).toBe('dropped');
    }
  });

  it('should change folder status back to active', async () => {
    const folderName = `EditFolder Test - Reactivate ${Date.now()}`;
    const folderId = await createTestFolder(folderName);

    // First drop it
    await editFolder({ id: folderId, newStatus: 'dropped' });
    await waitForSync();

    // Then reactivate
    const result = await editFolder({
      id: folderId,
      newStatus: 'active'
    });

    expect(result.success).toBe(true);

    // Verify status change
    await waitForSync();
    const listResult = await listFolders({ status: 'active' });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found).toBeTruthy();
      expect(found?.status).toBe('active');
    }
  });

  it('should edit both name and status simultaneously', async () => {
    const originalName = `EditFolder Test - Both ${Date.now()}`;
    const folderId = await createTestFolder(originalName);

    const newName = `EditFolder Test - Both Updated ${Date.now()}`;
    const result = await editFolder({
      id: folderId,
      newName,
      newStatus: 'dropped'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.name).toBe(newName);
    }

    // Verify both changes
    await waitForSync();
    const listResult = await listFolders({ status: 'dropped' });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found?.name).toBe(newName);
      expect(found?.status).toBe('dropped');
    }
  });

  it('should return error for non-existent folder ID', async () => {
    const result = await editFolder({
      id: 'nonexistent-folder-id-12345',
      newName: 'Should Not Work'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent folder name', async () => {
    const result = await editFolder({
      name: 'This Folder Does Not Exist At All 12345',
      newName: 'Should Not Work'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `EditFolder Test - Duplicate ${Date.now()}`;
    const id1 = await createTestFolder(duplicateName);
    const id2 = await createTestFolder(duplicateName);

    const result = await editFolder({
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

  it('should handle newName with special characters', async () => {
    const originalName = `EditFolder Test - Special ${Date.now()}`;
    const folderId = await createTestFolder(originalName);

    const newName = `EditFolder Test - Special !@#$% ${Date.now()}`;

    const result = await editFolder({
      id: folderId,
      newName
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.name).toBe(newName);
    }
  });
});
