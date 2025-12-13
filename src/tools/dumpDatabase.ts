import type { OmnifocusDatabase } from '../types.js';
import { logger } from '../utils/logger.js';
import { executeOmniJS } from '../utils/scriptExecution.js';

/**
 * Generate OmniJS script to export active tasks from OmniFocus database.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateOmnifocusDumpScript(): string {
  return `(() => {
  try {
    const startTime = new Date();

    // Helper function to format dates consistently or return null
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }

    // Helper function to safely get enum values - Simplified with direct mapping
    const taskStatusMap = {
      [Task.Status.Available]: "Available",
      [Task.Status.Blocked]: "Blocked",
      [Task.Status.Completed]: "Completed",
      [Task.Status.Dropped]: "Dropped",
      [Task.Status.DueSoon]: "DueSoon",
      [Task.Status.Next]: "Next",
      [Task.Status.Overdue]: "Overdue"
    };

    const projectStatusMap = {
      [Project.Status.Active]: "Active",
      [Project.Status.Done]: "Done",
      [Project.Status.Dropped]: "Dropped",
      [Project.Status.OnHold]: "OnHold"
    };

    const folderStatusMap = {
      [Folder.Status.Active]: "Active",
      [Folder.Status.Dropped]: "Dropped"
    };

    function getEnumValue(enumObj, mapObj) {
      if (enumObj === null || enumObj === undefined) return null;
      return mapObj[enumObj] || "Unknown";
    }

    // Create database export object using Maps for faster lookups
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      projects: {},
      folders: {},
      tags: {}
    };

    // Filter active projects first to avoid unnecessary processing
    const activeProjects = flattenedProjects.filter(project =>
      project.status !== Project.Status.Done &&
      project.status !== Project.Status.Dropped
    );

    // Pre-filter active tasks to avoid repeated filtering
    const activeTasks = flattenedTasks.filter(task =>
      task.taskStatus !== Task.Status.Completed &&
      task.taskStatus !== Task.Status.Dropped
    );

    // Pre-filter active folders
    const activeFolders = flattenedFolders.filter(folder =>
      folder.status !== Folder.Status.Dropped
    );

    // Pre-filter active tags
    const activeTags = flattenedTags.filter(tag => tag.active);

    // Process projects in a single pass and store in Map for O(1) lookups
    const projectsMap = new Map();
    activeProjects.forEach(project => {
      try {
        const projectId = project.id.primaryKey;
        const projectData = {
          id: projectId,
          name: project.name,
          status: getEnumValue(project.status, projectStatusMap),
          folderID: project.parentFolder ? project.parentFolder.id.primaryKey : null,
          sequential: project.task.sequential || false,
          effectiveDueDate: formatDate(project.effectiveDueDate),
          effectiveDeferDate: formatDate(project.effectiveDeferDate),
          dueDate: formatDate(project.dueDate),
          deferDate: formatDate(project.deferDate),
          completedByChildren: project.completedByChildren,
          containsSingletonActions: project.containsSingletonActions,
          note: project.note || "",
          tasks: [] // Will be populated in the task loop
        };
        projectsMap.set(projectId, projectData);
        exportData.projects[projectId] = projectData;
      } catch (projectError) {
        // Silently handle project processing errors
      }
    });

    // Process folders in a single pass
    const foldersMap = new Map();
    activeFolders.forEach(folder => {
      try {
        const folderId = folder.id.primaryKey;
        const folderData = {
          id: folderId,
          name: folder.name,
          parentFolderID: folder.parent ? folder.parent.id.primaryKey : null,
          status: getEnumValue(folder.status, folderStatusMap),
          projects: [],
          subfolders: []
        };
        foldersMap.set(folderId, folderData);
        exportData.folders[folderId] = folderData;
      } catch (folderError) {
        // Silently handle folder processing errors
      }
    });

    // Process tags in a single pass
    const tagsMap = new Map();
    activeTags.forEach(tag => {
      try {
        const tagId = tag.id.primaryKey;
        const tagData = {
          id: tagId,
          name: tag.name,
          parentTagID: tag.parent ? tag.parent.id.primaryKey : null,
          active: tag.active,
          allowsNextAction: tag.allowsNextAction,
          tasks: []
        };
        tagsMap.set(tagId, tagData);
        exportData.tags[tagId] = tagData;
      } catch (tagError) {
        // Silently handle tag processing errors
      }
    });

    // Build folder relationships and project-folder relationships as we go
    foldersMap.forEach((folder, folderId) => {
      if (folder.parentFolderID && foldersMap.has(folder.parentFolderID)) {
        const parentFolder = foldersMap.get(folder.parentFolderID);
        if (!parentFolder.subfolders.includes(folder.id)) {
          parentFolder.subfolders.push(folder.id);
        }
      }
    });

    // Process tasks with an optimized approach
    // Process in batches of 100 to prevent UI freezing
    const BATCH_SIZE = 100;

    for (let i = 0; i < activeTasks.length; i += BATCH_SIZE) {
      const taskBatch = activeTasks.slice(i, i + BATCH_SIZE);

      taskBatch.forEach(task => {
        try {
          // Get task data with minimal processing
          const taskTags = task.tags.map(tag => tag.id.primaryKey);
          const projectID = task.containingProject ? task.containingProject.id.primaryKey : null;

          const taskData = {
            id: task.id.primaryKey,
            name: task.name,
            note: task.note || "",
            taskStatus: getEnumValue(task.taskStatus, taskStatusMap),
            flagged: task.flagged,
            dueDate: formatDate(task.dueDate),
            deferDate: formatDate(task.deferDate),
            effectiveDueDate: formatDate(task.effectiveDueDate),
            effectiveDeferDate: formatDate(task.effectiveDeferDate),
            estimatedMinutes: task.estimatedMinutes,
            completedByChildren: task.completedByChildren,
            sequential: task.sequential || false,
            tags: taskTags,
            projectID: projectID,
            parentTaskID: task.parent ? task.parent.id.primaryKey : null,
            children: task.children.map(child => child.id.primaryKey),
            inInbox: task.inInbox
          };

          // Add task to export
          exportData.tasks.push(taskData);

          // Add task ID to associated project (if it exists)
          if (projectID && projectsMap.has(projectID)) {
            projectsMap.get(projectID).tasks.push(taskData.id);

            // Update folder-project relationship (only once per project)
            const project = projectsMap.get(projectID);
            if (project.folderID && foldersMap.has(project.folderID)) {
              const folder = foldersMap.get(project.folderID);
              if (!folder.projects.includes(project.id)) {
                folder.projects.push(project.id);
              }
            }
          }

          // Add task ID to associated tags
          taskTags.forEach(tagID => {
            if (tagsMap.has(tagID)) {
              tagsMap.get(tagID).tasks.push(taskData.id);
            }
          });
        } catch (taskError) {
          // Silently handle task processing errors
        }
      });
    }

    // Return the complete database export
    const jsonData = JSON.stringify(exportData);
    return jsonData;

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: "Error exporting database: " + error.toString()
    });
  }
})();`;
}

// Define interfaces for the data returned from the script
interface OmnifocusDumpTask {
  id: string;
  name: string;
  note?: string;
  taskStatus: string;
  flagged: boolean;
  dueDate: string | null;
  deferDate: string | null;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  estimatedMinutes: number | null;
  completedByChildren: boolean;
  sequential: boolean;
  tags: string[];
  projectID: string | null;
  parentTaskID: string | null;
  children: string[];
  inInbox: boolean;
}

interface OmnifocusDumpProject {
  id: string;
  name: string;
  status: string;
  folderID: string | null;
  sequential: boolean;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  dueDate: string | null;
  deferDate: string | null;
  completedByChildren: boolean;
  containsSingletonActions: boolean;
  note: string;
  tasks: string[];
}

interface OmnifocusDumpFolder {
  id: string;
  name: string;
  parentFolderID: string | null;
  status: string;
  projects: string[];
  subfolders: string[];
}

interface OmnifocusDumpTag {
  id: string;
  name: string;
  parentTagID: string | null;
  active: boolean;
  allowsNextAction: boolean;
  tasks: string[];
}

interface OmnifocusDumpData {
  exportDate: string;
  tasks: OmnifocusDumpTask[];
  projects: Record<string, OmnifocusDumpProject>;
  folders: Record<string, OmnifocusDumpFolder>;
  tags: Record<string, OmnifocusDumpTag>;
}

// Main function to dump the database
export async function dumpDatabase(): Promise<OmnifocusDatabase> {
  try {
    // Execute the OmniJS script
    const script = generateOmnifocusDumpScript();
    const data = (await executeOmniJS(script)) as OmnifocusDumpData;
    // wait 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create an empty database if no data returned
    if (!data) {
      return {
        exportDate: new Date().toISOString(),
        tasks: [],
        projects: {},
        folders: {},
        tags: {}
      };
    }

    // Initialize the database object
    const database: OmnifocusDatabase = {
      exportDate: data.exportDate,
      tasks: [],
      projects: {},
      folders: {},
      tags: {}
    };

    // Process tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      // Convert the tasks to our OmnifocusTask format
      database.tasks = data.tasks.map((task: OmnifocusDumpTask) => {
        // Get tag names from the tag IDs
        const tagNames = (task.tags || []).map((tagId) => {
          return data.tags[tagId]?.name || 'Unknown Tag';
        });

        return {
          id: String(task.id),
          name: String(task.name),
          note: String(task.note || ''),
          flagged: Boolean(task.flagged),
          completed: task.taskStatus === 'Completed',
          completionDate: null, // Not available in the new format
          dropDate: null, // Not available in the new format
          taskStatus: String(task.taskStatus),
          active: task.taskStatus !== 'Completed' && task.taskStatus !== 'Dropped',
          dueDate: task.dueDate,
          deferDate: task.deferDate,
          estimatedMinutes: task.estimatedMinutes ? Number(task.estimatedMinutes) : null,
          tags: task.tags || [],
          tagNames: tagNames,
          parentId: task.parentTaskID || null,
          containingProjectId: task.projectID || null,
          projectId: task.projectID || null,
          childIds: task.children || [],
          hasChildren: (task.children && task.children.length > 0) || false,
          sequential: Boolean(task.sequential),
          completedByChildren: Boolean(task.completedByChildren),
          isRepeating: false, // Not available in the new format
          repetitionMethod: null, // Not available in the new format
          repetitionRule: null, // Not available in the new format
          attachments: [], // Default empty array
          linkedFileURLs: [], // Default empty array
          notifications: [], // Default empty array
          shouldUseFloatingTimeZone: false // Default value
        };
      });
    }

    // Process projects
    if (data.projects) {
      for (const [id, project] of Object.entries(data.projects)) {
        database.projects[id] = {
          id: String(project.id),
          name: String(project.name),
          status: String(project.status),
          folderID: project.folderID || null,
          sequential: Boolean(project.sequential),
          effectiveDueDate: project.effectiveDueDate,
          effectiveDeferDate: project.effectiveDeferDate,
          dueDate: project.dueDate,
          deferDate: project.deferDate,
          completedByChildren: Boolean(project.completedByChildren),
          containsSingletonActions: Boolean(project.containsSingletonActions),
          note: String(project.note || ''),
          tasks: project.tasks || [],
          flagged: false, // Default value
          estimatedMinutes: null // Default value
        };
      }
    }

    // Process folders
    if (data.folders) {
      for (const [id, folder] of Object.entries(data.folders)) {
        database.folders[id] = {
          id: String(folder.id),
          name: String(folder.name),
          parentFolderID: folder.parentFolderID || null,
          status: String(folder.status),
          projects: folder.projects || [],
          subfolders: folder.subfolders || []
        };
      }
    }

    // Process tags
    if (data.tags) {
      for (const [id, tag] of Object.entries(data.tags)) {
        database.tags[id] = {
          id: String(tag.id),
          name: String(tag.name),
          parentTagID: tag.parentTagID || null,
          active: Boolean(tag.active),
          allowsNextAction: Boolean(tag.allowsNextAction),
          tasks: tag.tasks || []
        };
      }
    }

    return database;
  } catch (error) {
    logger.error('Error in dumpDatabase', 'dumpDatabase', { error });
    throw error;
  }
}
