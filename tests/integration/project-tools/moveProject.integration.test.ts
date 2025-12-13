import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { moveProject } from '../../../src/tools/primitives/moveProject.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('moveProject integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];
  const createdSubfolderIds: string[] = [];
  let subfolder1Id: string;
  let subfolder2Id: string;

  beforeAll(async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) return;

    // Create two subfolders for move testing
    const sub1 = await addFolder({
      name: 'MoveProject Test - Subfolder 1',
      parentFolderId: testFolderId
    });
    if (sub1.success) {
      subfolder1Id = sub1.id;
      createdSubfolderIds.push(sub1.id);
    }

    const sub2 = await addFolder({
      name: 'MoveProject Test - Subfolder 2',
      parentFolderId: testFolderId
    });
    if (sub2.success) {
      subfolder2Id = sub2.id;
      createdSubfolderIds.push(sub2.id);
    }

    // Wait for OmniFocus to sync after folder creation
    await waitForSync();
  });

  afterAll(async () => {
    // Clean up test projects first
    for (const id of createdProjectIds) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }

    // Then clean up subfolders
    for (const id of createdSubfolderIds) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  async function createTestProject(name: string, folderId?: string) {
    const testFolderId = folderId || getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');

    const result = await createProject({
      name,
      folderId: testFolderId
    });

    if (result.success) {
      createdProjectIds.push(result.id);
      // Wait for OmniFocus to sync before returning
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
  }

  it('should move project to folder by ID', async () => {
    expect(subfolder1Id).toBeTruthy();
    expect(subfolder2Id).toBeTruthy();

    // Create project in subfolder 1
    const projectId = await createTestProject('MoveProject Test - To Folder ID', subfolder1Id);

    // Verify initial location
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.parentFolder?.id).toBe(subfolder1Id);
    }

    // Move to subfolder 2
    const result = await moveProject({
      id: projectId,
      targetFolderId: subfolder2Id
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parentFolderId).toBe(subfolder2Id);

      // Verify new location
      readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.parentFolder?.id).toBe(subfolder2Id);
      }
    }
  });

  it('should move project to folder by name', async () => {
    expect(subfolder1Id).toBeTruthy();

    // Create project in test folder root
    const testFolderId = getTestFolderId();
    const projectId = await createTestProject('MoveProject Test - To Folder Name', testFolderId!);

    // Move to subfolder 1 by name
    const result = await moveProject({
      id: projectId,
      targetFolderName: 'MoveProject Test - Subfolder 1'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parentFolderId).toBe(subfolder1Id);
    }
  });

  it('should move project to root', async () => {
    expect(subfolder1Id).toBeTruthy();

    // Create project in subfolder
    const projectId = await createTestProject('MoveProject Test - To Root', subfolder1Id);

    // Verify starts in subfolder
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.parentFolder).toBeTruthy();
    }

    // Move to root
    const result = await moveProject({
      id: projectId,
      root: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parentFolderId).toBeNull();
      expect(result.parentFolderName).toBeNull();

      // Verify at root
      readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.parentFolder).toBeNull();
      }
    }
  });

  it('should move project with position: beginning', async () => {
    expect(subfolder1Id).toBeTruthy();

    // Create two projects in subfolder 1
    await createTestProject('MoveProject Test - First', subfolder1Id);
    const projectId = await createTestProject('MoveProject Test - Second', subfolder1Id);

    // Move the second project to beginning of subfolder 2
    const result = await moveProject({
      id: projectId,
      targetFolderId: subfolder2Id,
      position: 'beginning'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parentFolderId).toBe(subfolder2Id);
    }
  });

  it('should move project after sibling project', async () => {
    expect(subfolder2Id).toBeTruthy();

    // Create anchor project in subfolder 2
    const anchorId = await createTestProject('MoveProject Test - Anchor', subfolder2Id);

    // Create project to move in a different folder
    const projectId = await createTestProject('MoveProject Test - After Sibling', subfolder1Id);

    // Move after the anchor project
    const result = await moveProject({
      id: projectId,
      targetFolderId: subfolder2Id,
      afterProject: anchorId
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parentFolderId).toBe(subfolder2Id);
    }
  });

  it('should move project by name', async () => {
    const uniqueName = `MoveProject Test - By Name ${Date.now()}`;
    const projectId = await createTestProject(uniqueName, subfolder1Id);

    const result = await moveProject({
      name: uniqueName,
      targetFolderId: subfolder2Id
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(projectId);
      expect(result.parentFolderId).toBe(subfolder2Id);
    }
  });

  it('should return error for non-existent target folder', async () => {
    const projectId = await createTestProject('MoveProject Test - Bad Target');

    const result = await moveProject({
      id: projectId,
      targetFolderId: 'nonexistent-folder-id-12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      // Error message varies - could be "not found" or OmniFocus sync error
      expect(result.error).toBeTruthy();
    }
  });

  it('should return error for non-existent project', async () => {
    const result = await moveProject({
      id: 'nonexistent-project-id-12345',
      targetFolderId: subfolder1Id
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous project name', async () => {
    const duplicateName = `MoveProject Test - Duplicate ${Date.now()}`;
    await createTestProject(duplicateName, subfolder1Id);
    await createTestProject(duplicateName, subfolder1Id);

    const result = await moveProject({
      name: duplicateName,
      targetFolderId: subfolder2Id
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds?.length).toBeGreaterThanOrEqual(2);
    }
  });
});
