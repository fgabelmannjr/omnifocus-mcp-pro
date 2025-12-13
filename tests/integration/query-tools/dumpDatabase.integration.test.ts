import { afterEach, describe, expect, it } from 'vitest';
import { dumpDatabase } from '../../../src/tools/dumpDatabase.js';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('dumpDatabase integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdFolderIds: string[] = [];

  afterEach(async () => {
    // Clean up tasks first
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;

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

  it('should return database structure', async () => {
    const result = await dumpDatabase();

    // Verify the database structure has expected top-level properties
    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.projects).toBeDefined();
    expect(result.folders).toBeDefined();
    expect(result.tags).toBeDefined();
  });

  it('should return tasks array', async () => {
    const result = await dumpDatabase();

    expect(Array.isArray(result.tasks)).toBe(true);
  });

  it('should return projects as object/record', async () => {
    const result = await dumpDatabase();

    expect(typeof result.projects).toBe('object');
    expect(result.projects).not.toBeNull();
  });

  it('should return folders as object/record', async () => {
    const result = await dumpDatabase();

    expect(typeof result.folders).toBe('object');
    expect(result.folders).not.toBeNull();
  });

  it('should return tags as object/record', async () => {
    const result = await dumpDatabase();

    expect(typeof result.tags).toBe('object');
    expect(result.tags).not.toBeNull();
  });

  it('should include created task in dump', async () => {
    const taskName = `DumpDB Test - Task ${Date.now()}`;
    const taskResult = await addOmniFocusTask({ name: taskName });

    expect(taskResult.success).toBe(true);
    if (taskResult.success && taskResult.taskId) {
      createdTaskIds.push(taskResult.taskId);
    }

    await waitForSync();

    const result = await dumpDatabase();

    // Find our test task in the dump
    const foundTask = result.tasks.find(
      (task) => task.name === taskName || task.id === taskResult.taskId
    );
    expect(foundTask).toBeDefined();
    if (foundTask) {
      expect(foundTask.name).toBe(taskName);
    }
  });

  it('should include created folder in dump', async () => {
    const folderName = `DumpDB Test - Folder ${Date.now()}`;
    const folderResult = await addFolder({ name: folderName });

    expect(folderResult.success).toBe(true);
    if (folderResult.success && folderResult.folderId) {
      createdFolderIds.push(folderResult.folderId);
    }

    await waitForSync();

    const result = await dumpDatabase();

    // Find our test folder in the dump
    const folderEntries = Object.values(result.folders);
    const foundFolder = folderEntries.find(
      (folder) => folder.name === folderName || folder.id === folderResult.folderId
    );
    expect(foundFolder).toBeDefined();
    if (foundFolder) {
      expect(foundFolder.name).toBe(folderName);
    }
  });

  it('should return task properties', async () => {
    const taskName = `DumpDB Test - Props ${Date.now()}`;
    const taskResult = await addOmniFocusTask({
      name: taskName,
      flagged: true
    });

    expect(taskResult.success).toBe(true);
    if (taskResult.success && taskResult.taskId) {
      createdTaskIds.push(taskResult.taskId);
    }

    await waitForSync();

    const result = await dumpDatabase();

    const foundTask = result.tasks.find((task) => task.name === taskName);
    expect(foundTask).toBeDefined();
    if (foundTask) {
      // Verify task has expected properties
      expect(foundTask.id).toBeDefined();
      expect(foundTask.name).toBe(taskName);
      expect(foundTask.flagged).toBe(true);
    }
  });

  it('should return folder properties', async () => {
    const folderName = `DumpDB Test - FolderProps ${Date.now()}`;
    const folderResult = await addFolder({ name: folderName });

    expect(folderResult.success).toBe(true);
    if (folderResult.success && folderResult.folderId) {
      createdFolderIds.push(folderResult.folderId);
    }

    await waitForSync();

    const result = await dumpDatabase();

    const folderEntries = Object.values(result.folders);
    const foundFolder = folderEntries.find((folder) => folder.name === folderName);
    expect(foundFolder).toBeDefined();
    if (foundFolder) {
      expect(foundFolder.id).toBeDefined();
      expect(foundFolder.name).toBe(folderName);
    }
  });

  it('should be idempotent (multiple calls return consistent structure)', async () => {
    const result1 = await dumpDatabase();
    const result2 = await dumpDatabase();

    // Both results should have the same structure
    expect(Array.isArray(result1.tasks)).toBe(true);
    expect(Array.isArray(result2.tasks)).toBe(true);
    expect(typeof result1.projects).toBe('object');
    expect(typeof result2.projects).toBe('object');
    expect(typeof result1.folders).toBe('object');
    expect(typeof result2.folders).toBe('object');
  });

  it('should handle large database without error', async () => {
    // This test just verifies the function completes without throwing
    // The actual performance depends on the user's OmniFocus database size
    const result = await dumpDatabase();

    expect(result).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.projects).toBeDefined();
    expect(result.folders).toBeDefined();
  });
});
