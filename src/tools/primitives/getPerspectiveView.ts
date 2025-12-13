import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

export interface GetPerspectiveViewParams {
  perspectiveName: string;
  limit?: number | undefined;
  includeMetadata?: boolean | undefined;
  fields?: string[] | undefined;
}

export interface PerspectiveItem {
  id?: string;
  name?: string;
  note?: string;
  flagged?: boolean;
  completed?: boolean;
  dueDate?: string | null;
  deferDate?: string | null;
  completionDate?: string | null;
  taskStatus?: string;
  projectName?: string;
  tagNames?: string[];
  estimatedMinutes?: number | null;
  [key: string]: unknown; // Allow additional properties from JXA
}

interface PerspectiveViewResult {
  success: boolean;
  items?: PerspectiveItem[];
  error?: string;
}

/**
 * Generate OmniJS script to get the current perspective view.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateGetPerspectiveViewScript(): string {
  return `(function() {
  try {
    // Note: We can't easily switch perspectives via OmniJS
    // We can only report what's currently visible in the window

    // Get the current window and its perspective
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({
        success: false,
        error: "No OmniFocus window is open"
      });
    }

    // Get the current perspective
    var currentPerspective = win.perspective;
    var perspectiveName = "Unknown";

    // Identify the perspective
    if (currentPerspective) {
      if (currentPerspective === Perspective.BuiltIn.Inbox) {
        perspectiveName = "Inbox";
      } else if (currentPerspective === Perspective.BuiltIn.Projects) {
        perspectiveName = "Projects";
      } else if (currentPerspective === Perspective.BuiltIn.Tags) {
        perspectiveName = "Tags";
      } else if (currentPerspective === Perspective.BuiltIn.Forecast) {
        perspectiveName = "Forecast";
      } else if (currentPerspective === Perspective.BuiltIn.Flagged) {
        perspectiveName = "Flagged";
      } else if (currentPerspective === Perspective.BuiltIn.Review) {
        perspectiveName = "Review";
      } else if (currentPerspective.name) {
        // Custom perspective
        perspectiveName = currentPerspective.name;
      }
    }

    // Get visible items based on the perspective
    var items = [];
    var selection = win.selection;
    var selectedTasks = selection.tasks;
    var selectedProjects = selection.projects;

    // Helper function to format dates
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }

    // Helper to get task details
    function getTaskDetails(task) {
      var details = {
        id: task.id.primaryKey,
        name: task.name,
        completed: task.completed,
        flagged: task.flagged,
        note: task.note || '',
        dueDate: formatDate(task.dueDate),
        deferDate: formatDate(task.deferDate),
        completionDate: formatDate(task.completionDate),
        estimatedMinutes: task.estimatedMinutes
      };

      // Task status
      var statusMap = {};
      statusMap[Task.Status.Available] = "Available";
      statusMap[Task.Status.Blocked] = "Blocked";
      statusMap[Task.Status.Completed] = "Completed";
      statusMap[Task.Status.Dropped] = "Dropped";
      statusMap[Task.Status.DueSoon] = "DueSoon";
      statusMap[Task.Status.Next] = "Next";
      statusMap[Task.Status.Overdue] = "Overdue";
      details.taskStatus = statusMap[task.taskStatus] || "Unknown";

      // Project context
      var project = task.containingProject;
      details.projectName = project ? project.name : null;

      // Tags
      details.tagNames = task.tags.map(function(tag) { return tag.name; });

      return details;
    }

    // Get project details
    function getProjectDetails(project) {
      return {
        id: project.id.primaryKey,
        name: project.name,
        type: 'project',
        status: project.status,
        note: project.note || '',
        flagged: project.flagged || false,
        dueDate: formatDate(project.dueDate),
        deferDate: formatDate(project.deferDate),
        folderName: project.parentFolder ? project.parentFolder.name : null
      };
    }

    // Try to get content based on perspective type
    if (perspectiveName === "Inbox") {
      // Get inbox tasks
      inbox.forEach(function(task) {
        items.push(getTaskDetails(task));
      });
    } else if (perspectiveName === "Projects") {
      // Get all active projects
      flattenedProjects.forEach(function(project) {
        if (project.status === Project.Status.Active) {
          items.push(getProjectDetails(project));
        }
      });
    } else if (perspectiveName === "Tags") {
      // Get tagged tasks
      flattenedTags.forEach(function(tag) {
        tag.remainingTasks.forEach(function(task) {
          var taskDetail = getTaskDetails(task);
          var isDuplicate = items.some(function(item) { return item.id === taskDetail.id; });
          if (!isDuplicate) {
            items.push(taskDetail);
          }
        });
      });
    } else if (perspectiveName === "Flagged") {
      // Get flagged items
      flattenedTasks.forEach(function(task) {
        if (task.flagged && !task.completed) {
          items.push(getTaskDetails(task));
        }
      });
    } else {
      // For other perspectives, try to get selected or visible items
      if (selectedTasks.length > 0) {
        selectedTasks.forEach(function(task) {
          items.push(getTaskDetails(task));
        });
      }
      if (selectedProjects.length > 0) {
        selectedProjects.forEach(function(project) {
          items.push(getProjectDetails(project));
        });
      }

      // If no selection, get some available tasks
      if (items.length === 0) {
        var availableTasks = flattenedTasks.filter(function(task) {
          return task.taskStatus === Task.Status.Available && !task.completed;
        });
        availableTasks.slice(0, 100).forEach(function(task) {
          items.push(getTaskDetails(task));
        });
      }
    }

    return JSON.stringify({
      success: true,
      perspectiveName: perspectiveName,
      items: items.slice(0, 100) // Limit to 100 items by default
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;
}

export async function getPerspectiveView(
  params: GetPerspectiveViewParams
): Promise<PerspectiveViewResult> {
  // Validate required parameters
  if (
    !params ||
    typeof params.perspectiveName !== 'string' ||
    params.perspectiveName.trim().length === 0
  ) {
    return {
      success: false,
      error: 'Perspective name is required and must be a non-empty string'
    };
  }

  const { perspectiveName, limit = 100, fields } = params;
  // Note: includeMetadata is reserved for future use

  try {
    // Execute the OmniJS script to get perspective view
    // Note: This gets the current perspective view, not a specific one
    // OmniJS doesn't easily allow switching perspectives
    const script = generateGetPerspectiveViewScript();
    const result = (await executeOmniJS(script)) as {
      error?: string;
      perspectiveName?: string;
      items?: PerspectiveItem[];
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Check if the current perspective matches what was requested
    const currentPerspective = result.perspectiveName;
    if (currentPerspective && currentPerspective.toLowerCase() !== perspectiveName.toLowerCase()) {
      console.warn(
        `Note: Current perspective is "${currentPerspective}", not "${perspectiveName}". OmniJS cannot easily switch perspectives.`
      );
    }

    // Filter and limit items
    let items = result.items || [];

    // Apply field filtering if specified
    if (fields && fields.length > 0) {
      items = items.map((item) => {
        const filtered: PerspectiveItem = {};
        fields.forEach((field) => {
          if (Object.hasOwn(item, field)) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
    }

    // Apply limit
    if (limit && items.length > limit) {
      items = items.slice(0, limit);
    }

    return {
      success: true,
      items: items
    };
  } catch (error) {
    logger.error('Error getting perspective view', 'getPerspectiveView', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
