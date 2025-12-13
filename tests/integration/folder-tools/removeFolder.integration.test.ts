import { describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { listFolders } from '../../../src/tools/primitives/listFolders.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('removeFolder integration', () => {
  skipIfOmniFocusUnavailable();

  // Note: Folders are deleted as part of tests, so minimal cleanup needed

  async function createFolderForDeletion(name: string, parentId?: string): Promise<string> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');

    const result = await addFolder({
      name,
      position: { placement: 'ending', relativeTo: parentId || testFolderId }
    });

    if (result.success) {
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test folder: ${JSON.stringify(result)}`);
  }

  it('should delete folder by ID', async () => {
    const uniqueName = `RemoveFolder Test - ByID ${Date.now()}`;
    const folderId = await createFolderForDeletion(uniqueName);

    // Verify folder exists
    let listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found).toBeTruthy();
    }

    // Delete folder
    const result = await removeFolder({ id: folderId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(folderId);
      expect(result.name).toBe(uniqueName);
    }

    // Verify folder no longer exists
    await waitForSync();
    listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found).toBeFalsy();
    }
  });

  it('should delete folder by name', async () => {
    const uniqueName = `RemoveFolder Test - ByName ${Date.now()}`;
    const folderId = await createFolderForDeletion(uniqueName);

    const result = await removeFolder({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(folderId);
      expect(result.name).toBe(uniqueName);
    }

    // Verify deletion
    await waitForSync();
    const listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      const found = listResult.folders.find((f) => f.id === folderId);
      expect(found).toBeFalsy();
    }
  });

  it('should cascade delete child folders', async () => {
    const parentName = `RemoveFolder Test - Parent ${Date.now()}`;
    const parentId = await createFolderForDeletion(parentName);

    // Create child folder
    const childName = `RemoveFolder Test - Child ${Date.now()}`;
    const childId = await createFolderForDeletion(childName, parentId);

    // Verify both exist
    let listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.folders.find((f) => f.id === parentId)).toBeTruthy();
      expect(listResult.folders.find((f) => f.id === childId)).toBeTruthy();
    }

    // Delete parent (should cascade delete child)
    const result = await removeFolder({ id: parentId });
    expect(result.success).toBe(true);

    // Verify both are gone
    await waitForSync();
    listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.folders.find((f) => f.id === parentId)).toBeFalsy();
      expect(listResult.folders.find((f) => f.id === childId)).toBeFalsy();
    }
  });

  it('should cascade delete nested projects', async () => {
    const folderName = `RemoveFolder Test - WithProject ${Date.now()}`;
    const folderId = await createFolderForDeletion(folderName);

    // Create project inside folder
    const projectResult = await createProject({
      name: `Project in folder to delete ${Date.now()}`,
      folderId
    });
    expect(projectResult.success).toBe(true);

    // Delete folder (should cascade delete project)
    const result = await removeFolder({ id: folderId });
    expect(result.success).toBe(true);

    // Folder should be gone (project deletion is implicit via OmniFocus cascade)
    await waitForSync();
    const listResult = await listFolders({});
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.folders.find((f) => f.id === folderId)).toBeFalsy();
    }
  });

  it('should return error for non-existent folder ID', async () => {
    const result = await removeFolder({ id: 'nonexistent-folder-id-12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent folder name', async () => {
    const result = await removeFolder({ name: 'This Folder Does Not Exist At All 12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `RemoveFolder Test - Duplicate ${Date.now()}`;
    const id1 = await createFolderForDeletion(duplicateName);
    const id2 = await createFolderForDeletion(duplicateName);

    const result = await removeFolder({ name: duplicateName });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }

    // Clean up the duplicates
    await removeFolder({ id: id1 });
    await removeFolder({ id: id2 });
  });

  it('should return response with expected properties', async () => {
    const uniqueName = `RemoveFolder Test - Response ${Date.now()}`;
    const folderId = await createFolderForDeletion(uniqueName);

    const result = await removeFolder({ id: folderId });

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify response shape
      expect(result.id).toBeTruthy();
      expect(result.name).toBeTruthy();
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
    }
  });
});
