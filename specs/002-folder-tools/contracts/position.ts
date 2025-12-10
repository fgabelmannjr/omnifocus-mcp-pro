/**
 * Position Schema - Shared Zod Contract
 *
 * Specifies insertion location for create/move operations.
 * Maps directly to Omni Automation `Folder.ChildInsertionLocation`.
 *
 * @see spec.md clarification #33 for requirement rules
 * @see data-model.md Position Mapping table for Omni Automation expressions
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';

/**
 * Position Schema for folder placement operations.
 *
 * **Placement Options**:
 * - `before`: Insert before the folder specified by `relativeTo` (REQUIRED)
 * - `after`: Insert after the folder specified by `relativeTo` (REQUIRED)
 * - `beginning`: Insert at start of parent folder or library root
 * - `ending`: Insert at end of parent folder or library root
 *
 * **relativeTo Semantics**:
 * - For `before`/`after`: REQUIRED - specifies sibling folder ID
 * - For `beginning`/`ending`: OPTIONAL - specifies parent folder ID (omit for library root)
 *
 * **Position Mapping to Omni Automation**:
 * | MCP Position                                      | Omni Automation Expression                    |
 * |--------------------------------------------------|----------------------------------------------|
 * | `{ placement: "beginning" }`                      | `library.beginning`                          |
 * | `{ placement: "ending" }`                         | `library.ending`                             |
 * | `{ placement: "beginning", relativeTo: "id" }`    | `Folder.byIdentifier("id").beginning`        |
 * | `{ placement: "ending", relativeTo: "id" }`       | `Folder.byIdentifier("id").ending`           |
 * | `{ placement: "before", relativeTo: "id" }`       | `Folder.byIdentifier("id").before`           |
 * | `{ placement: "after", relativeTo: "id" }`        | `Folder.byIdentifier("id").after`            |
 *
 * **Error Handling**:
 * - Invalid `relativeTo` (folder not found): Returns `{ success: false, error: "Folder not found: <id>" }`
 * - Missing `relativeTo` for before/after: Zod validation error
 *
 * @see spec.md clarification #11 for invalid relativeTo error format
 */
export const PositionSchema = z
  .object({
    placement: z
      .enum(['before', 'after', 'beginning', 'ending'])
      .describe(
        "Position type: 'before'/'after' (relative to sibling), 'beginning'/'ending' (within parent)"
      ),
    relativeTo: z
      .string()
      .optional()
      .describe(
        'Folder ID to position relative to. REQUIRED for before/after (sibling), OPTIONAL for beginning/ending (parent; omit for library root)'
      )
  })
  .refine(
    (data) => {
      // For before/after, relativeTo is required
      if (data.placement === 'before' || data.placement === 'after') {
        return data.relativeTo !== undefined && data.relativeTo.length > 0;
      }
      return true;
    },
    {
      message: "relativeTo is required when placement is 'before' or 'after'",
      path: ['relativeTo']
    }
  );

export type Position = z.infer<typeof PositionSchema>;
