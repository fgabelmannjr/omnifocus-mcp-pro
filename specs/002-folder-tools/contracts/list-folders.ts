/**
 * list_folders - Zod Schema Contract
 *
 * Lists folders from the OmniFocus database with optional filtering.
 *
 * This tool retrieves folder information without modifying the database.
 * Use `add_folder` to create new folders, `edit_folder` to modify properties,
 * `move_folder` to change hierarchy position, or `remove_folder` to delete.
 *
 * @see spec.md FR-001 to FR-006 for functional requirements
 * @see data-model.md for Folder entity definition
 *
 * Zod version: 4.1.x
 */

import { z } from 'zod';

/**
 * Input Schema for list_folders
 *
 * **Behavior Matrix (parentId × includeChildren)**:
 *
 * | parentId  | includeChildren   | Result                                         |
 * |-----------|-------------------|------------------------------------------------|
 * | omitted   | omitted/true      | All folders via `flattenedFolders`             |
 * | omitted   | false             | Top-level only via `database.folders`          |
 * | specified | omitted/true      | Recursive children via `folder.flattenedFolders` |
 * | specified | false             | Immediate children via `folder.folders`        |
 *
 * **parentId Semantics**:
 * Both omitting `parentId` and passing `null` are semantically equivalent and
 * target the library root. This mirrors Omni Automation's behavior where `null`
 * or omitting position creates at library root.
 *
 * **Error Handling**:
 * - Invalid parentId (folder not found): Returns `{ success: false, error: "Folder not found: <id>" }`
 *
 * @see spec.md FR-006 for includeChildren behavior
 * @see spec.md clarification #8 for parentId null semantics
 * @see spec.md clarification #19 for invalid parentId error format
 */
export const ListFoldersInputSchema = z.object({
  status: z
    .enum(['active', 'dropped'])
    .optional()
    .describe("Filter folders by status ('active' or 'dropped')"),
  parentId: z
    .string()
    .optional()
    .describe(
      'Filter to children of this folder ID. Omit (or pass null) to target library root - returns all folders or top-level only depending on includeChildren.'
    ),
  includeChildren: z
    .boolean()
    .default(true)
    .describe(
      'Include nested folders recursively (default: true). When false, returns only immediate children or top-level folders.'
    )
});

export type ListFoldersInput = z.infer<typeof ListFoldersInputSchema>;

/**
 * Folder entity schema matching data-model.md Folder definition.
 *
 * @see data-model.md for complete entity specification
 */
export const FolderSchema = z.object({
  id: z.string().describe("Folder's unique identifier (Omni Automation primaryKey)"),
  name: z.string().describe("Folder's display name"),
  status: z
    .enum(['active', 'dropped'])
    .describe("Folder's current status: 'active' (visible) or 'dropped' (archived)"),
  parentId: z
    .string()
    .nullable()
    .describe('Parent folder ID (null for root-level folders in library)')
});

export type Folder = z.infer<typeof FolderSchema>;

// Success Response
export const ListFoldersSuccessSchema = z.object({
  success: z.literal(true),
  folders: z.array(FolderSchema).describe('Array of folder objects matching the filter criteria')
});

/**
 * Error Response
 *
 * **Possible Error Scenarios**:
 * - Invalid parentId: "Folder not found: <id>"
 *
 * @see spec.md clarification #9 for standard error format
 */
export const ListFoldersErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Human-readable error message')
});

// Combined Response
export const ListFoldersResponseSchema = z.discriminatedUnion('success', [
  ListFoldersSuccessSchema,
  ListFoldersErrorSchema
]);

export type ListFoldersResponse = z.infer<typeof ListFoldersResponseSchema>;
