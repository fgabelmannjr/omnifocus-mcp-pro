import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { listProjects } from '../../../src/tools/primitives/listProjects.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('listProjects integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];

  beforeAll(async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) {
      console.log('⚠️  listProjects beforeAll: testFolderId is null, skipping setup');
      return;
    }
    console.log(`✅ listProjects beforeAll: testFolderId = ${testFolderId}`);

    // Create various projects for testing different filter scenarios

    // Active project (default)
    const active1 = await createProject({
      name: 'ListProjects Test - Active 1',
      folderId: testFolderId
    });
    if (active1.success) createdProjectIds.push(active1.id);

    // Flagged project
    const flagged = await createProject({
      name: 'ListProjects Test - Flagged',
      folderId: testFolderId,
      flagged: true
    });
    if (flagged.success) createdProjectIds.push(flagged.id);

    // OnHold project
    const onHold = await createProject({
      name: 'ListProjects Test - OnHold',
      folderId: testFolderId,
      status: 'OnHold'
    });
    if (onHold.success) createdProjectIds.push(onHold.id);

    // Project with due date
    const withDue = await createProject({
      name: 'ListProjects Test - With Due',
      folderId: testFolderId,
      dueDate: '2025-06-15T17:00:00.000Z'
    });
    if (withDue.success) createdProjectIds.push(withDue.id);

    // Project with review interval
    const withReview = await createProject({
      name: 'ListProjects Test - With Review',
      folderId: testFolderId,
      reviewInterval: { steps: 7, unit: 'days' }
    });
    if (withReview.success) createdProjectIds.push(withReview.id);

    // Wait for OmniFocus to sync after all creations
    await waitForSync();
  });

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

  it('should list all projects (no filters)', async () => {
    const result = await listProjects({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toBeInstanceOf(Array);
      // Should include our test projects
      const testProjectNames = result.projects
        .filter((p) => p.name.startsWith('ListProjects Test'))
        .map((p) => p.name);
      expect(testProjectNames.length).toBeGreaterThanOrEqual(4); // At least our active test projects
    }
  });

  it('should list projects in specific folder by ID', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({ folderId: testFolderId });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned projects should be from our test folder
      // Note: ProjectSummary uses denormalized parentFolderId, not parentFolder.id
      const allInTestFolder = result.projects.every((p) => p.parentFolderId === testFolderId);
      expect(allInTestFolder).toBe(true);

      // Should include our test projects
      const testProjectNames = result.projects
        .filter((p) => p.name.startsWith('ListProjects Test'))
        .map((p) => p.name);
      expect(testProjectNames.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should filter by Active status only', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({
      folderId: testFolderId,
      status: ['Active']
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned projects should be Active
      const allActive = result.projects.every((p) => p.status === 'Active');
      expect(allActive).toBe(true);

      // Should NOT include OnHold project
      const onHoldProjects = result.projects.filter((p) => p.name === 'ListProjects Test - OnHold');
      expect(onHoldProjects.length).toBe(0);
    }
  });

  it('should filter by OnHold status', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({
      folderId: testFolderId,
      status: ['OnHold'],
      includeCompleted: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned projects should be OnHold
      const allOnHold = result.projects.every((p) => p.status === 'OnHold');
      expect(allOnHold).toBe(true);

      // Should include our OnHold project
      const onHoldProjects = result.projects.filter((p) => p.name === 'ListProjects Test - OnHold');
      expect(onHoldProjects.length).toBe(1);
    }
  });

  it('should filter flagged projects only', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({
      folderId: testFolderId,
      flagged: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned projects should be flagged
      const allFlagged = result.projects.every((p) => p.flagged === true);
      expect(allFlagged).toBe(true);

      // Should include our flagged project
      const flaggedProjects = result.projects.filter(
        (p) => p.name === 'ListProjects Test - Flagged'
      );
      expect(flaggedProjects.length).toBe(1);
    }
  });

  it('should respect limit parameter', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({
      folderId: testFolderId,
      limit: 2
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects.length).toBeLessThanOrEqual(2);
    }
  });

  it('should filter by due date (dueBefore)', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({
      folderId: testFolderId,
      dueBefore: '2025-12-31T23:59:59.000Z'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // All returned projects should have a due date before the cutoff
      // Projects without due dates are excluded
      const withDue = result.projects.filter((p) => p.dueDate !== null);
      expect(withDue.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should combine multiple filters with AND logic', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    // Filter: Active status AND in test folder
    const result = await listProjects({
      folderId: testFolderId,
      status: ['Active'],
      flagged: false
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // All projects should match ALL criteria
      // Note: ProjectSummary uses denormalized parentFolderId, not parentFolder.id
      const matchAll = result.projects.every(
        (p) => p.status === 'Active' && p.flagged === false && p.parentFolderId === testFolderId
      );
      expect(matchAll).toBe(true);
    }
  });

  it('should return project summary with expected properties', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const result = await listProjects({
      folderId: testFolderId,
      limit: 1
    });

    expect(result.success).toBe(true);
    if (result.success && result.projects.length > 0) {
      const project = result.projects[0];

      // Verify ProjectSummary shape (note: sequential and containsSingletonActions are NOT in summary)
      expect(project.id).toBeTruthy();
      expect(project.name).toBeTruthy();
      expect(project.status).toBeTruthy();
      expect(typeof project.flagged).toBe('boolean');
      // ProjectSummary has projectType (derived), not sequential/containsSingletonActions
      expect(project.projectType).toBeTruthy();
      // Optional fields can be null
      expect('deferDate' in project).toBe(true);
      expect('dueDate' in project).toBe(true);
      expect('taskCount' in project).toBe(true);
      expect('remainingCount' in project).toBe(true);
    }
  });
});
