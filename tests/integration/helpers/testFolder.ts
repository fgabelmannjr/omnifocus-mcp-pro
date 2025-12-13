import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

export const TEST_FOLDER_NAME = 'MCP Integration Tests';

interface EnsureTestFolderResult {
  success: boolean;
  id?: string;
  created?: boolean;
  error?: string;
}

interface CleanupResult {
  success: boolean;
  deletedProjects?: number;
  deletedFolders?: number;
  message?: string;
  error?: string;
}

/**
 * Ensure the test folder exists, creating it if necessary.
 * Returns the folder ID.
 */
export async function ensureTestFolder(): Promise<string> {
  const script = `(function() {
  try {
    var folder = flattenedFolders.byName("${TEST_FOLDER_NAME}");
    if (folder) {
      return JSON.stringify({ success: true, id: folder.id.primaryKey, created: false });
    }

    // Create at library root
    var newFolder = new Folder("${TEST_FOLDER_NAME}", library.ending);
    return JSON.stringify({ success: true, id: newFolder.id.primaryKey, created: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed: EnsureTestFolderResult =
    typeof result === 'string' ? JSON.parse(result) : (result as EnsureTestFolderResult);
  if (!parsed.success || !parsed.id) {
    throw new Error(parsed.error || 'Failed to ensure test folder');
  }
  return parsed.id;
}

/**
 * Get the test folder ID if it exists.
 * Returns null if the folder doesn't exist.
 */
export async function getTestFolderId(): Promise<string | null> {
  const script = `(function() {
  try {
    var folder = flattenedFolders.byName("${TEST_FOLDER_NAME}");
    if (folder) {
      return JSON.stringify({ success: true, id: folder.id.primaryKey });
    }
    return JSON.stringify({ success: true, id: null });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to get test folder');
  }
  return parsed.id || null;
}

/**
 * Delete all projects and subfolders inside the test folder.
 * Does NOT delete the test folder itself.
 */
export async function cleanupTestFolder(folderId: string): Promise<void> {
  const script = `(function() {
  try {
    var folder = Folder.byIdentifier("${folderId}");
    if (!folder) {
      return JSON.stringify({ success: true, message: "Folder not found" });
    }

    // Delete all projects in folder (cascade deletes their tasks)
    var projects = folder.flattenedProjects.slice();
    var projectCount = projects.length;
    projects.forEach(function(p) { deleteObject(p); });

    // Delete all subfolders
    var subfolders = folder.folders.slice();
    var folderCount = subfolders.length;
    subfolders.forEach(function(f) { deleteObject(f); });

    return JSON.stringify({ success: true, deletedProjects: projectCount, deletedFolders: folderCount });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed: CleanupResult =
    typeof result === 'string' ? JSON.parse(result) : (result as CleanupResult);
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to cleanup test folder');
  }
}

/**
 * Delete the test folder entirely (for full cleanup).
 */
export async function deleteTestFolder(): Promise<void> {
  const script = `(function() {
  try {
    var folder = flattenedFolders.byName("${TEST_FOLDER_NAME}");
    if (folder) {
      deleteObject(folder);
    }
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to delete test folder');
  }
}
