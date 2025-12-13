import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('createProject integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];

  afterEach(async () => {
    // Clean up any projects created during test
    for (const id of createdProjectIds) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;
  });

  it('should create project with default settings in test folder', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - Default Settings',
      folderId: testFolderId
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      // Verify by reading back
      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.name).toBe('Integration Test - Default Settings');
        expect(readBack.project.parentFolder?.id).toBe(testFolderId);
        // Default project type is parallel (sequential=false, containsSingletonActions=false)
        expect(readBack.project.sequential).toBe(false);
        expect(readBack.project.containsSingletonActions).toBe(false);
        expect(readBack.project.projectType).toBe('parallel');
      }
    }
  });

  it('should create sequential project', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - Sequential',
      folderId: testFolderId,
      sequential: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.sequential).toBe(true);
        expect(readBack.project.containsSingletonActions).toBe(false);
        expect(readBack.project.projectType).toBe('sequential');
      }
    }
  });

  it('should create single-actions project', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - Single Actions',
      folderId: testFolderId,
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.sequential).toBe(false);
        expect(readBack.project.containsSingletonActions).toBe(true);
        expect(readBack.project.projectType).toBe('single-actions');
      }
    }
  });

  it('should apply auto-clear when both type flags set (containsSingletonActions wins)', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - Both Flags',
      folderId: testFolderId,
      sequential: true,
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        // containsSingletonActions wins, sequential auto-cleared
        expect(readBack.project.containsSingletonActions).toBe(true);
        expect(readBack.project.sequential).toBe(false);
        expect(readBack.project.projectType).toBe('single-actions');
      }
    }
  });

  it('should create project with dates', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const deferDate = '2025-02-01T09:00:00.000Z';
    const dueDate = '2025-02-28T17:00:00.000Z';

    const result = await createProject({
      name: 'Integration Test - With Dates',
      folderId: testFolderId,
      deferDate,
      dueDate
    });

    if (!result.success) {
      console.log('❌ createProject with dates failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.deferDate).toBeTruthy();
        expect(readBack.project.dueDate).toBeTruthy();
      }
    }
  });

  it('should create project with review interval', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - With Review',
      folderId: testFolderId,
      reviewInterval: { steps: 7, unit: 'days' }
    });

    if (!result.success) {
      console.log('❌ createProject with review interval failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.reviewInterval).toBeTruthy();
        expect(readBack.project.reviewInterval?.steps).toBe(7);
        expect(readBack.project.reviewInterval?.unit).toBe('days');
      }
    }
  });

  it('should create project with note', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - With Note',
      folderId: testFolderId,
      note: 'This is a test note for the integration test project.'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.note).toBe('This is a test note for the integration test project.');
      }
    }
  });

  it('should create flagged project', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - Flagged',
      folderId: testFolderId,
      flagged: true
    });

    if (!result.success) {
      console.log('❌ createProject flagged failed:', JSON.stringify(result));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      // Wait for OmniFocus to sync before reading back
      await waitForSync();

      const readBack = await getProject({ id: result.id });
      if (!readBack.success) {
        console.log('❌ getProject for flagged failed:', JSON.stringify(readBack));
      }
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.flagged).toBe(true);
      }
    }
  });

  it('should return error for non-existent folder ID', async () => {
    const result = await createProject({
      name: 'Integration Test - Bad Folder',
      folderId: 'nonexistent-folder-id-12345'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should create project with OnHold status', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await createProject({
      name: 'Integration Test - OnHold',
      folderId: testFolderId,
      status: 'OnHold'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      createdProjectIds.push(result.id);

      const readBack = await getProject({ id: result.id });
      expect(readBack.success).toBe(true);
      if (readBack.success) {
        expect(readBack.project.status).toBe('OnHold');
      }
    }
  });
});
