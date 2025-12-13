import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('getProject integration', () => {
  skipIfOmniFocusUnavailable();

  let testProjectId: string;
  let testProjectName: string;
  let duplicateProject1Id: string;
  let duplicateProject2Id: string;

  beforeAll(async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) {
      console.log('⚠️  getProject beforeAll: testFolderId is null, skipping setup');
      return;
    }

    // Create a project with full properties for testing
    const result = await createProject({
      name: 'GetProject Test - Full Properties',
      folderId: testFolderId,
      flagged: true,
      sequential: true,
      note: 'Test note for getProject',
      deferDate: '2025-03-01T09:00:00.000Z',
      dueDate: '2025-03-31T17:00:00.000Z',
      reviewInterval: { steps: 14, unit: 'days' }
    });

    if (result.success) {
      testProjectId = result.id;
      testProjectName = result.name;
      console.log(`✅ getProject beforeAll: Created test project (ID: ${testProjectId})`);
    } else {
      console.log(
        '❌ getProject beforeAll: Failed to create test project:',
        JSON.stringify(result)
      );
    }

    // Create two projects with the same name for disambiguation testing
    const dup1 = await createProject({
      name: 'GetProject Test - Duplicate Name',
      folderId: testFolderId
    });
    if (dup1.success) {
      duplicateProject1Id = dup1.id;
    }

    const dup2 = await createProject({
      name: 'GetProject Test - Duplicate Name',
      folderId: testFolderId
    });
    if (dup2.success) {
      duplicateProject2Id = dup2.id;
    }

    // Wait for OmniFocus to sync after all creations
    await waitForSync();
  });

  afterAll(async () => {
    // Clean up test projects
    const projectsToDelete = [testProjectId, duplicateProject1Id, duplicateProject2Id];
    for (const id of projectsToDelete) {
      if (id) {
        try {
          await deleteProject({ id });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  it('should get project by valid ID', async () => {
    expect(testProjectId).toBeTruthy();

    const result = await getProject({ id: testProjectId });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.id).toBe(testProjectId);
      expect(result.project.name).toBe('GetProject Test - Full Properties');
    }
  });

  it('should get project by unique name', async () => {
    expect(testProjectName).toBeTruthy();

    const result = await getProject({ name: testProjectName });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.id).toBe(testProjectId);
      expect(result.project.name).toBe(testProjectName);
    }
  });

  it('should return error for non-existent ID', async () => {
    const result = await getProject({ id: 'nonexistent-project-id-12345' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should return disambiguation error for ambiguous name', async () => {
    expect(duplicateProject1Id).toBeTruthy();
    expect(duplicateProject2Id).toBeTruthy();

    const result = await getProject({ name: 'GetProject Test - Duplicate Name' });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toContain(duplicateProject1Id);
      expect(result.matchingIds).toContain(duplicateProject2Id);
    }
  });

  it('should return all ProjectFull properties', async () => {
    expect(testProjectId).toBeTruthy();

    const result = await getProject({ id: testProjectId });

    expect(result.success).toBe(true);
    if (result.success) {
      const project = result.project;

      // Verify core properties exist
      expect(project.id).toBeTruthy();
      expect(project.name).toBeTruthy();
      expect(project.status).toBeTruthy();
      expect(typeof project.sequential).toBe('boolean');
      expect(typeof project.containsSingletonActions).toBe('boolean');
      expect(project.projectType).toBeTruthy();

      // Verify note
      expect(project.note).toBe('Test note for getProject');

      // Verify flagged
      expect(project.flagged).toBe(true);

      // Verify sequential
      expect(project.sequential).toBe(true);
      expect(project.projectType).toBe('sequential');

      // Verify dates exist (exact values may vary due to timezone)
      expect(project.deferDate).toBeTruthy();
      expect(project.dueDate).toBeTruthy();

      // Verify review interval
      expect(project.reviewInterval).toBeTruthy();
      expect(project.reviewInterval?.steps).toBe(14);
      expect(project.reviewInterval?.unit).toBe('days');

      // Verify parent folder reference
      expect(project.parentFolder).toBeTruthy();
      expect(project.parentFolder?.id).toBe(getTestFolderId());

      // Verify computed/system properties exist (per ProjectFullSchema)
      expect(typeof project.completedByChildren).toBe('boolean');
      expect(typeof project.defaultSingletonActionHolder).toBe('boolean');
      expect(typeof project.completed).toBe('boolean');
      expect(typeof project.effectiveFlagged).toBe('boolean');
    }
  });

  it('should prefer ID over name when both provided', async () => {
    expect(testProjectId).toBeTruthy();

    // Provide correct ID with wrong name - should return the project found by ID
    const result = await getProject({
      id: testProjectId,
      name: 'Completely Wrong Name That Does Not Exist'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.id).toBe(testProjectId);
      expect(result.project.name).toBe('GetProject Test - Full Properties');
    }
  });
});
