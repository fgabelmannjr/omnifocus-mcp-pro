import { beforeAll, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('deleteProject integration', () => {
  skipIfOmniFocusUnavailable();

  // Note: Projects are deleted as part of the tests, so no afterAll cleanup needed

  async function createTestProject(name: string, options: Record<string, unknown> = {}) {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');

    const result = await createProject({
      name,
      folderId: testFolderId,
      ...options
    });

    if (result.success) {
      // Wait for OmniFocus to sync before returning
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
  }

  it('should delete project by ID', async () => {
    const projectId = await createTestProject('DeleteProject Test - By ID');

    // Verify project exists
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);

    // Delete project
    const result = await deleteProject({ id: projectId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(projectId);
      expect(result.name).toBe('DeleteProject Test - By ID');
      expect(result.message).toBeTruthy();
    }

    // Verify project no longer exists
    readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(false);
    if (!readBack.success && 'error' in readBack) {
      expect(readBack.error).toContain('not found');
    }
  });

  it('should delete project by name', async () => {
    const uniqueName = `DeleteProject Test - By Name ${Date.now()}`;
    const projectId = await createTestProject(uniqueName);

    // Delete by name
    const result = await deleteProject({ name: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(projectId);
      expect(result.name).toBe(uniqueName);
    }

    // Verify project no longer exists
    const readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(false);
  });

  it('should cascade delete child tasks', async () => {
    const projectId = await createTestProject('DeleteProject Test - With Tasks');

    // Add some tasks to the project
    const task1 = await addOmniFocusTask({
      name: 'Task 1 in project to delete',
      projectId
    });
    const task2 = await addOmniFocusTask({
      name: 'Task 2 in project to delete',
      projectId
    });

    expect(task1.success).toBe(true);
    expect(task2.success).toBe(true);

    // Delete the project
    const result = await deleteProject({ id: projectId });

    expect(result.success).toBe(true);
    if (result.success) {
      // Message should mention cascade deletion
      expect(result.message).toContain('task');
    }

    // Project should be gone
    const readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(false);
  });

  it('should return error for non-existent project ID', async () => {
    const result = await deleteProject({ id: 'nonexistent-project-id-12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return error for non-existent project name', async () => {
    const result = await deleteProject({ name: 'This Project Does Not Exist At All 12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `DeleteProject Test - Duplicate ${Date.now()}`;
    const id1 = await createTestProject(duplicateName);
    const id2 = await createTestProject(duplicateName);

    const result = await deleteProject({ name: duplicateName });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(id1);
      expect(result.matchingIds).toContain(id2);
    }

    // Clean up the duplicate projects
    await deleteProject({ id: id1 });
    await deleteProject({ id: id2 });
  });

  it('should return response with expected properties', async () => {
    const projectId = await createTestProject('DeleteProject Test - Response Shape');

    const result = await deleteProject({ id: projectId });

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify DeleteProjectSuccess shape
      expect(result.id).toBeTruthy();
      expect(result.name).toBeTruthy();
      expect(result.message).toBeTruthy();
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.message).toBe('string');
    }
  });
});
