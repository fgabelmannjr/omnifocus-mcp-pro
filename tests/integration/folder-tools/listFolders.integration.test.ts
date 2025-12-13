import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { editFolder } from '../../../src/tools/primitives/editFolder.js';
import { listFolders } from '../../../src/tools/primitives/listFolders.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('listFolders integration', () => {
  skipIfOmniFocusUnavailable();

  // Test data created in beforeAll
  let parentFolderId: string;
  let childFolder1Id: string;
  let childFolder2Id: string;
  let droppedFolderId: string;
  const createdFolderIds: string[] = [];

  beforeAll(async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) {
      console.log('⚠️  testFolderId is null, skipping setup');
      return;
    }

    // Create parent folder for hierarchy tests
    const parentResult = await addFolder({
      name: `ListFolders Test - Parent ${Date.now()}`,
      position: { placement: 'ending', relativeTo: testFolderId }
    });
    if (parentResult.success) {
      parentFolderId = parentResult.id;
      createdFolderIds.push(parentResult.id);
    }

    await waitForSync();

    // Create child folders inside parent
    const child1Result = await addFolder({
      name: `ListFolders Test - Child1 ${Date.now()}`,
      position: { placement: 'ending', relativeTo: parentFolderId }
    });
    if (child1Result.success) {
      childFolder1Id = child1Result.id;
      createdFolderIds.push(child1Result.id);
    }

    const child2Result = await addFolder({
      name: `ListFolders Test - Child2 ${Date.now()}`,
      position: { placement: 'ending', relativeTo: parentFolderId }
    });
    if (child2Result.success) {
      childFolder2Id = child2Result.id;
      createdFolderIds.push(child2Result.id);
    }

    // Create dropped folder
    const droppedResult = await addFolder({
      name: `ListFolders Test - Dropped ${Date.now()}`,
      position: { placement: 'ending', relativeTo: testFolderId }
    });
    if (droppedResult.success) {
      droppedFolderId = droppedResult.id;
      createdFolderIds.push(droppedResult.id);
      await editFolder({ id: droppedFolderId, newStatus: 'dropped' });
    }

    await waitForSync();
  });

  afterAll(async () => {
    // Clean up in reverse order (children first)
    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should list all folders without filters', async () => {
    const result = await listFolders({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.folders.length).toBeGreaterThan(0);
      // Should include our test folders
      const foundParent = result.folders.find((f) => f.id === parentFolderId);
      expect(foundParent).toBeTruthy();
    }
  });

  it('should filter folders by active status', async () => {
    const result = await listFolders({ status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned folders should be active
      for (const folder of result.folders) {
        expect(folder.status).toBe('active');
      }
      // Should include our active test folders
      const foundParent = result.folders.find((f) => f.id === parentFolderId);
      expect(foundParent).toBeTruthy();
      // Should NOT include dropped folder
      const foundDropped = result.folders.find((f) => f.id === droppedFolderId);
      expect(foundDropped).toBeFalsy();
    }
  });

  it('should filter folders by dropped status', async () => {
    const result = await listFolders({ status: 'dropped' });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned folders should be dropped
      for (const folder of result.folders) {
        expect(folder.status).toBe('dropped');
      }
      // Should include our dropped test folder
      const foundDropped = result.folders.find((f) => f.id === droppedFolderId);
      expect(foundDropped).toBeTruthy();
    }
  });

  it('should filter folders by parent ID', async () => {
    const result = await listFolders({ parentId: parentFolderId });

    expect(result.success).toBe(true);
    if (result.success) {
      // Should find child folders
      const foundChild1 = result.folders.find((f) => f.id === childFolder1Id);
      const foundChild2 = result.folders.find((f) => f.id === childFolder2Id);
      expect(foundChild1).toBeTruthy();
      expect(foundChild2).toBeTruthy();
    }
  });

  it('should return folder properties correctly', async () => {
    const result = await listFolders({});

    expect(result.success).toBe(true);
    if (result.success) {
      const folder = result.folders.find((f) => f.id === parentFolderId);
      expect(folder).toBeTruthy();
      if (folder) {
        // Check expected properties exist
        expect(folder.id).toBeTruthy();
        expect(folder.name).toBeTruthy();
        expect(folder.status).toBeTruthy();
        expect(['active', 'dropped']).toContain(folder.status);
      }
    }
  });

  it('should include nested folders when includeChildren is true (default)', async () => {
    const testFolderId = getTestFolderId();
    const result = await listFolders({ parentId: testFolderId!, includeChildren: true });

    expect(result.success).toBe(true);
    if (result.success) {
      // Should find both parent and its children (flattened)
      const foundParent = result.folders.find((f) => f.id === parentFolderId);
      const foundChild1 = result.folders.find((f) => f.id === childFolder1Id);
      expect(foundParent).toBeTruthy();
      expect(foundChild1).toBeTruthy();
    }
  });

  it('should return empty array for folder with no children', async () => {
    // Child folders have no children
    const result = await listFolders({ parentId: childFolder1Id });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.folders.length).toBe(0);
    }
  });

  it('should combine status and parent filters', async () => {
    const testFolderId = getTestFolderId();

    const result = await listFolders({
      parentId: testFolderId!,
      status: 'active'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Should find active parent folder
      const foundParent = result.folders.find((f) => f.id === parentFolderId);
      expect(foundParent).toBeTruthy();
      // Should NOT find dropped folder
      const foundDropped = result.folders.find((f) => f.id === droppedFolderId);
      expect(foundDropped).toBeFalsy();
    }
  });
});
