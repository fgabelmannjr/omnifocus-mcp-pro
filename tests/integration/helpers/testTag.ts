import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

export const TEST_TAG_PREFIX = 'MCP Test Tag';

interface CreateTagResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface CleanupResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

/**
 * Create a test tag with the standard prefix.
 * @param name - Tag name (will be prefixed with TEST_TAG_PREFIX)
 * @param parentId - Optional parent tag ID for nested tags
 * @returns Created tag ID
 */
export async function createTestTag(name: string, parentId?: string): Promise<string> {
  const fullName = `${TEST_TAG_PREFIX} - ${name}`;
  const parentClause = parentId
    ? `var parent = Tag.byIdentifier("${parentId}"); if (!parent) throw new Error("Parent tag not found"); var newTag = new Tag("${fullName}", parent.ending);`
    : `var newTag = new Tag("${fullName}", tags.ending);`;

  const script = `(function() {
  try {
    ${parentClause}
    return JSON.stringify({ success: true, id: newTag.id.primaryKey });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed: CreateTagResult =
    typeof result === 'string' ? JSON.parse(result) : (result as CreateTagResult);

  if (!parsed.success || !parsed.id) {
    throw new Error(parsed.error || 'Failed to create test tag');
  }
  return parsed.id;
}

/**
 * Delete a tag by ID.
 */
export async function deleteTestTag(id: string): Promise<void> {
  const script = `(function() {
  try {
    var tag = Tag.byIdentifier("${id}");
    if (tag) {
      deleteObject(tag);
    }
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to delete test tag');
  }
}

/**
 * Clean up all test tags (those with TEST_TAG_PREFIX).
 * Deletes from deepest children first to avoid orphan issues.
 */
export async function cleanupTestTags(): Promise<void> {
  const script = `(function() {
  try {
    var prefix = "${TEST_TAG_PREFIX}";
    var deleted = 0;

    // Find all test tags and sort by depth (deepest first)
    function getDepth(tag) {
      var depth = 0;
      var current = tag.parent;
      while (current) {
        depth++;
        current = current.parent;
      }
      return depth;
    }

    var testTags = flattenedTags.filter(function(t) {
      return t.name.indexOf(prefix) === 0;
    });

    // Sort by depth descending (delete children before parents)
    testTags.sort(function(a, b) {
      return getDepth(b) - getDepth(a);
    });

    testTags.forEach(function(tag) {
      try {
        deleteObject(tag);
        deleted++;
      } catch (e) {
        // Ignore - might already be deleted with parent
      }
    });

    return JSON.stringify({ success: true, deletedCount: deleted });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed: CleanupResult =
    typeof result === 'string' ? JSON.parse(result) : (result as CleanupResult);

  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to cleanup test tags');
  }
}

/**
 * Get the ID of a tag by name (exact match).
 */
export async function getTagIdByName(name: string): Promise<string | null> {
  const script = `(function() {
  try {
    var tag = flattenedTags.byName("${name}");
    if (tag) {
      return JSON.stringify({ success: true, id: tag.id.primaryKey });
    }
    return JSON.stringify({ success: true, id: null });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;

  const result = await executeOmniJS(script);
  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to get tag by name');
  }
  return parsed.id || null;
}
