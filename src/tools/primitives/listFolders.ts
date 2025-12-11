import type { Folder, ListFoldersInput } from '../../contracts/folder-tools/list-folders.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Response type for listFolders
 */
export type ListFoldersResponse =
  | { success: true; folders: Folder[] }
  | { success: false; error: string };

/**
 * Generate Omni Automation JavaScript for listing folders
 */
function generateOmniScript(params: ListFoldersInput): string {
  const { status, parentId, includeChildren = true } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const parentIdEscaped = parentId ? escapeForJS(parentId) : '';
  const statusFilter = status ? escapeForJS(status) : '';

  return `(function() {
  try {
    var parentId = "${parentIdEscaped}";
    var statusFilter = "${statusFilter}";
    var includeChildren = ${includeChildren};
    var folders = [];
    var sourceFolders;

    // Determine source folders based on parentId and includeChildren
    if (parentId && parentId.length > 0) {
      // Find the parent folder
      var parentFolder = Folder.byIdentifier(parentId);
      if (!parentFolder) {
        return JSON.stringify({
          success: false,
          error: "Invalid parentId '" + parentId + "': folder not found"
        });
      }
      // Get children based on includeChildren flag
      sourceFolders = includeChildren ? parentFolder.flattenedFolders : parentFolder.folders;
    } else {
      // No parentId - get from library root
      sourceFolders = includeChildren ? flattenedFolders : library.folders;
    }

    // Convert to array and process
    var folderArray = [];
    sourceFolders.forEach(function(folder) {
      folderArray.push(folder);
    });

    // Map folder status to string
    function mapStatus(folder) {
      // Folder.Status enum: Active, Dropped
      if (folder.status === Folder.Status.Dropped) {
        return "dropped";
      }
      return "active";
    }

    // Filter and map folders
    folderArray.forEach(function(folder) {
      var folderStatus = mapStatus(folder);

      // Apply status filter if specified
      if (statusFilter && statusFilter.length > 0) {
        if (folderStatus !== statusFilter) {
          return; // Skip this folder
        }
      }

      folders.push({
        id: folder.id.primaryKey,
        name: folder.name,
        status: folderStatus,
        parentId: folder.parent ? folder.parent.id.primaryKey : null
      });
    });

    return JSON.stringify({
      success: true,
      folders: folders
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * List folders from OmniFocus using Omni Automation JavaScript
 *
 * @param params - Filter parameters (status, parentId, includeChildren)
 * @returns Promise with folders array or error
 */
export async function listFolders(params: ListFoldersInput = {}): Promise<ListFoldersResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'list_folders', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as ListFoldersResponse;

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      folders: result.folders
    };
  } catch (error: unknown) {
    console.error('Error in listFolders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in listFolders'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
