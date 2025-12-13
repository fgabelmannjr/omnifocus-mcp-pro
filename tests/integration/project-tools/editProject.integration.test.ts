import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { editProject } from '../../../src/tools/primitives/editProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('editProject integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];

  async function createTestProject(name: string, options: Record<string, unknown> = {}) {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');

    const result = await createProject({
      name,
      folderId: testFolderId,
      ...options
    });

    if (result.success) {
      createdProjectIds.push(result.id);
      // Wait for OmniFocus to sync before returning
      await waitForSync();
      return result.id;
    }
    throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
  }

  afterAll(async () => {
    // Clean up test projects
    for (const id of createdProjectIds) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should edit project by ID', async () => {
    const projectId = await createTestProject('EditProject Test - By ID');

    const result = await editProject({
      id: projectId,
      note: 'Updated note via ID'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.note).toBe('Updated note via ID');
      }
    }
  });

  it('should edit project by name', async () => {
    const uniqueName = `EditProject Test - By Name ${Date.now()}`;
    const projectId = await createTestProject(uniqueName);

    const result = await editProject({
      name: uniqueName,
      note: 'Updated note via name'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.note).toBe('Updated note via name');
      }
    }
  });

  it('should rename project', async () => {
    const projectId = await createTestProject('EditProject Test - Original Name');

    const result = await editProject({
      id: projectId,
      newName: 'EditProject Test - Renamed'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.name).toBe('EditProject Test - Renamed');

      const readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.name).toBe('EditProject Test - Renamed');
      }
    }
  });

  it('should change status from Active to OnHold', async () => {
    const projectId = await createTestProject('EditProject Test - Status Change');
    console.log(`📝 Created project for OnHold test: ${projectId}`);

    const result = await editProject({
      id: projectId,
      status: 'OnHold'
    });

    if (!result.success) {
      console.log('❌ editProject OnHold failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const readBack = await getProject({ id: projectId });
      if (!readBack.success) {
        console.log('❌ getProject for OnHold readBack failed:', JSON.stringify(readBack));
      }
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.status).toBe('OnHold');
      }
    }
  });

  it('should change status from Active to Done', async () => {
    const projectId = await createTestProject('EditProject Test - Mark Done');

    // Wait for OmniFocus to sync before editing
    await waitForSync();

    const result = await editProject({
      id: projectId,
      status: 'Done'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      await waitForSync();
      const readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.status).toBe('Done');
      }
    }
  });

  it('should apply auto-clear when changing to containsSingletonActions', async () => {
    // Create a sequential project first
    const projectId = await createTestProject('EditProject Test - Auto-Clear', {
      sequential: true
    });
    console.log(`📝 Created sequential project for auto-clear test: ${projectId}`);

    // Verify it's sequential
    let readBack = await getProject({ id: projectId });
    if (!readBack.success) {
      console.log('❌ getProject for auto-clear initial check failed:', JSON.stringify(readBack));
    }
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.sequential).toBe(true);
    }

    // Change to containsSingletonActions - should auto-clear sequential
    const result = await editProject({
      id: projectId,
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      readBack = await getProject({ id: projectId });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.containsSingletonActions).toBe(true);
        expect(readBack.project.sequential).toBe(false);
        expect(readBack.project.projectType).toBe('single-actions');
      }
    }
  });

  it('should set and clear dates', async () => {
    const projectId = await createTestProject('EditProject Test - Dates');

    // Wait for OmniFocus to sync before editing
    await waitForSync();

    // Set dates
    let result = await editProject({
      id: projectId,
      deferDate: '2025-04-01T09:00:00.000Z',
      dueDate: '2025-04-30T17:00:00.000Z'
    });

    if (!result.success) {
      console.log('❌ editProject set dates failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    await waitForSync();
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.deferDate).toBeTruthy();
      expect(readBack.project.dueDate).toBeTruthy();
    }

    // Clear dates
    result = await editProject({
      id: projectId,
      deferDate: null,
      dueDate: null
    });

    expect(result.success).toBe(true);
    await waitForSync();
    readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.deferDate).toBeNull();
      expect(readBack.project.dueDate).toBeNull();
    }
  });

  it('should set and modify review interval', async () => {
    const projectId = await createTestProject('EditProject Test - Review');

    // Wait for OmniFocus to sync before editing
    await waitForSync();

    // Set review interval to 14 days
    let result = await editProject({
      id: projectId,
      reviewInterval: { steps: 14, unit: 'days' }
    });

    if (!result.success) {
      console.log('❌ editProject set review interval failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    await waitForSync();
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.reviewInterval).toBeTruthy();
      expect(readBack.project.reviewInterval?.steps).toBe(14);
      expect(readBack.project.reviewInterval?.unit).toBe('days');
    }

    // Modify review interval to 1 month
    // Note: OmniFocus does not allow clearing reviewInterval to null once set
    result = await editProject({
      id: projectId,
      reviewInterval: { steps: 1, unit: 'months' }
    });

    if (!result.success) {
      console.log('❌ editProject modify review interval failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    await waitForSync();
    readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.reviewInterval).toBeTruthy();
      expect(readBack.project.reviewInterval?.steps).toBe(1);
      expect(readBack.project.reviewInterval?.unit).toBe('months');
    }
  });

  it('should toggle flagged status', async () => {
    const projectId = await createTestProject('EditProject Test - Flag Toggle');

    // Set flagged to true
    let result = await editProject({
      id: projectId,
      flagged: true
    });

    expect(result.success).toBe(true);
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.flagged).toBe(true);
    }

    // Set flagged to false
    result = await editProject({
      id: projectId,
      flagged: false
    });

    expect(result.success).toBe(true);
    readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.flagged).toBe(false);
    }
  });

  it('should return error for non-existent project ID', async () => {
    const result = await editProject({
      id: 'nonexistent-project-id-12345',
      note: 'This should fail'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    const duplicateName = `EditProject Test - Duplicate ${Date.now()}`;
    await createTestProject(duplicateName);
    await createTestProject(duplicateName);

    const result = await editProject({
      name: duplicateName,
      note: 'This should require disambiguation'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds?.length).toBeGreaterThanOrEqual(2);
    }
  });
});
