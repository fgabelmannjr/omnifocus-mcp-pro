import type { OmnifocusPerspective } from '../../types.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

export interface ListPerspectivesParams {
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
}

interface ListPerspectivesResult {
  success: boolean;
  perspectives?: OmnifocusPerspective[];
  error?: string;
}

/**
 * Generate OmniJS script to list all available perspectives.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateListPerspectivesScript(): string {
  return `(function() {
  try {
    var perspectives = [];

    // Get all built-in perspectives
    var builtInPerspectives = [
      { obj: Perspective.BuiltIn.Inbox, name: 'Inbox' },
      { obj: Perspective.BuiltIn.Projects, name: 'Projects' },
      { obj: Perspective.BuiltIn.Tags, name: 'Tags' },
      { obj: Perspective.BuiltIn.Forecast, name: 'Forecast' },
      { obj: Perspective.BuiltIn.Flagged, name: 'Flagged' },
      { obj: Perspective.BuiltIn.Review, name: 'Review' }
    ];

    // Add built-in perspectives
    builtInPerspectives.forEach(function(p) {
      perspectives.push({
        id: 'builtin_' + p.name.toLowerCase(),
        name: p.name,
        type: 'builtin',
        isBuiltIn: true,
        canModify: false
      });
    });

    // Get all custom perspectives
    // Custom perspectives might not be available (Standard edition)
    try {
      var customPerspectives = Perspective.Custom.all;
      if (customPerspectives && customPerspectives.length > 0) {
        customPerspectives.forEach(function(p) {
          perspectives.push({
            id: p.identifier || 'custom_' + p.name.toLowerCase().replace(/\\s+/g, '_'),
            name: p.name,
            type: 'custom',
            isBuiltIn: false,
            canModify: true
          });
        });
      }
    } catch (e) {
      // Custom perspectives might not be available - not a fatal error
    }

    return JSON.stringify({
      success: true,
      perspectives: perspectives
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;
}

export async function listPerspectives(
  params: ListPerspectivesParams = {}
): Promise<ListPerspectivesResult> {
  const { includeBuiltIn = true, includeCustom = true } = params;

  try {
    // Execute the OmniJS script to list perspectives
    const script = generateListPerspectivesScript();
    const result = (await executeOmniJS(script)) as {
      error?: string;
      perspectives?: OmnifocusPerspective[];
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Filter perspectives based on parameters
    let perspectives = result.perspectives || [];

    if (!includeBuiltIn) {
      perspectives = perspectives.filter((p) => p.type !== 'builtin');
    }

    if (!includeCustom) {
      perspectives = perspectives.filter((p) => p.type !== 'custom');
    }

    return {
      success: true,
      perspectives: perspectives
    };
  } catch (error) {
    logger.error('Error listing perspectives', 'listPerspectives', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
