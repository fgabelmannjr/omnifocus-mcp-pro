import { afterEach, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { addProject } from '../../../src/tools/primitives/addProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('addProject integration (legacy)', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];
  const createdFolderIds: string[] = [];

  afterEach(async () => {
    // Clean up projects first
    for (const id of [...createdProjectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;

    // Then folders
    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFolderIds.length = 0;
  });

  it('should create a project with just a name', async () => {
    const projectName = `AddProject Test - Simple ${Date.now()}`;

    const result = await addProject({ name: projectName });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      // Verify project was created
      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.name).toBe(projectName);
      }
    }
  });

  it('should create a project with a note', async () => {
    const projectName = `AddProject Test - Note ${Date.now()}`;
    const projectNote = 'This is a test note for the project';

    const result = await addProject({
      name: projectName,
      note: projectNote
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.note).toBe(projectNote);
      }
    }
  });

  it('should create a flagged project', async () => {
    const projectName = `AddProject Test - Flagged ${Date.now()}`;

    const result = await addProject({
      name: projectName,
      flagged: true
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.flagged).toBe(true);
      }
    }
  });

  it('should create a sequential project', async () => {
    const projectName = `AddProject Test - Sequential ${Date.now()}`;

    const result = await addProject({
      name: projectName,
      sequential: true
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.sequential).toBe(true);
      }
    }
  });

  it('should create a parallel project (sequential=false)', async () => {
    const projectName = `AddProject Test - Parallel ${Date.now()}`;

    const result = await addProject({
      name: projectName,
      sequential: false
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.sequential).toBe(false);
      }
    }
  });

  it('should create a project with due date', async () => {
    const projectName = `AddProject Test - DueDate ${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days from now
    const dueDateISO = dueDate.toISOString();

    const result = await addProject({
      name: projectName,
      dueDate: dueDateISO
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.dueDate).toBeTruthy();
      }
    }
  });

  it('should create a project with defer date', async () => {
    const projectName = `AddProject Test - DeferDate ${Date.now()}`;
    const deferDate = new Date();
    deferDate.setDate(deferDate.getDate() + 3); // 3 days from now
    const deferDateISO = deferDate.toISOString();

    const result = await addProject({
      name: projectName,
      deferDate: deferDateISO
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.deferDate).toBeTruthy();
      }
    }
  });

  it('should create a project in a specific folder', async () => {
    // First create a folder
    const folderName = `AddProject Test Folder ${Date.now()}`;
    const folderResult = await addFolder({ name: folderName });
    expect(folderResult.success).toBe(true);
    if (folderResult.success && folderResult.folderId) {
      createdFolderIds.push(folderResult.folderId);
    }

    await waitForSync();

    const projectName = `AddProject Test - InFolder ${Date.now()}`;
    const result = await addProject({
      name: projectName,
      folderName: folderName
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.parentFolder?.name).toBe(folderName);
      }
    }
  });

  it('should create a project with estimated minutes', async () => {
    const projectName = `AddProject Test - Estimate ${Date.now()}`;

    const result = await addProject({
      name: projectName,
      estimatedMinutes: 60
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.estimatedMinutes).toBe(60);
      }
    }
  });

  it('should return error for empty project name', async () => {
    const result = await addProject({ name: '' });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('required');
    }
  });

  it('should return error for whitespace-only name', async () => {
    const result = await addProject({ name: '   ' });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('required');
    }
  });

  it('should return error for non-existent folder', async () => {
    const projectName = `AddProject Test - BadFolder ${Date.now()}`;

    const result = await addProject({
      name: projectName,
      folderName: 'NonExistentFolder12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error.toLowerCase()).toContain('folder');
    }
  });

  it('should handle project name with special characters', async () => {
    const projectName = `AddProject Test - Special !@#$% ${Date.now()}`;

    const result = await addProject({ name: projectName });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.name).toBe(projectName);
      }
    }
  });

  it('should create project with all properties combined', async () => {
    const projectName = `AddProject Test - AllProps ${Date.now()}`;
    const projectNote = 'Full property test';
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const result = await addProject({
      name: projectName,
      note: projectNote,
      dueDate: dueDate.toISOString(),
      flagged: true,
      sequential: true,
      estimatedMinutes: 120
    });

    expect(result.success).toBe(true);
    if (result.success && result.projectId) {
      createdProjectIds.push(result.projectId);

      await waitForSync();
      const getResult = await getProject({ id: result.projectId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.project.name).toBe(projectName);
        expect(getResult.project.note).toBe(projectNote);
        expect(getResult.project.flagged).toBe(true);
        expect(getResult.project.sequential).toBe(true);
        expect(getResult.project.estimatedMinutes).toBe(120);
        expect(getResult.project.dueDate).toBeTruthy();
      }
    }
  });
});
