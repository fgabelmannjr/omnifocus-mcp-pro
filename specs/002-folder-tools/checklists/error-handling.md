# Error Handling Patterns Checklist: Folder Management Tools

**Purpose**: Validate consistency, completeness, and quality of error handling requirements across all folder management operations
**Created**: 2025-12-10
**Feature**: [spec.md](../spec.md) - FR-027, FR-028, Clarifications #1, #9, #11, #19, #28, #34, #36

**Focus Areas**:
- Error Response Structure consistency
- Error Scenarios Coverage per tool
- Error Message Quality standards
- Error Handling Layers architecture
- Constitution Principle V alignment

---

## Error Response Structure Requirements

- [ ] CHK001 - Is the standard error response format `{ success: false, error: string }` explicitly defined? [Completeness, Spec §FR-028]
- [ ] CHK002 - Is the disambiguation error format `{ success: false, error: string, code: "DISAMBIGUATION_REQUIRED", matchingIds: string[] }` explicitly defined? [Completeness, Spec §FR-027]
- [ ] CHK003 - Are the response schemas using discriminated unions with `success` as discriminator for compile-time type narrowing? [Clarity, Contracts]
- [ ] CHK004 - Is the `success: false` literal type enforced in Zod error schemas (not just boolean)? [Clarity, Contracts]
- [ ] CHK005 - Is the `code` field defined as a string literal `"DISAMBIGUATION_REQUIRED"` (not generic string) for programmatic detection? [Clarity, Contracts]
- [ ] CHK006 - Is the `matchingIds` field typed as `string[]` (array of IDs) with appropriate description? [Completeness, Contracts]
- [ ] CHK007 - Are response unions structured to allow type discrimination between success, standard error, and disambiguation error? [Consistency, Contracts]
- [ ] CHK008 - Is it clear which tools require disambiguation support vs standard errors only? [Clarity, Gap]

## Error Scenarios Coverage - list_folders

- [ ] CHK009 - Is the error response for invalid `parentId` (non-existent folder) specified with actionable message format? [Completeness, Spec §Clarification #19]
- [ ] CHK010 - Is the error message format for invalid parentId defined as "Invalid parentId 'xyz': folder not found"? [Clarity, Spec §Clarification #19]
- [ ] CHK011 - Are transport-level failures (OmniFocus not running, osascript timeout) addressed by referencing existing `scriptExecution.ts` patterns? [Coverage, Spec §Clarification #36]
- [ ] CHK012 - Is it explicitly stated that `list_folders` does NOT support disambiguation (read-only operation)? [Clarity, Gap]
- [ ] CHK013 - Are Zod validation error scenarios (invalid status enum value, malformed input) covered? [Coverage, Gap]

## Error Scenarios Coverage - add_folder

- [ ] CHK014 - Is the error response for empty name after trim specified? [Completeness, Spec §Clarification #17]
- [ ] CHK015 - Is the error message for empty name defined as "Folder name is required and must be a non-empty string"? [Clarity, Contracts/add-folder.ts]
- [ ] CHK016 - Is the error response for invalid `relativeTo` (non-existent folder) specified? [Completeness, Spec §Clarification #11]
- [ ] CHK017 - Is the error message format for invalid relativeTo defined as "Invalid relativeTo 'xyz': folder not found"? [Clarity, Spec §Clarification #11]
- [ ] CHK018 - Is the error response for wrong-parent relativeTo (before/after with sibling in different parent) specified? [Completeness, Spec §Clarification #11]
- [ ] CHK019 - Is the error message format for wrong-parent relativeTo defined as "Invalid relativeTo 'xyz': folder is not a sibling in target parent"? [Clarity, Spec §Clarification #11]
- [ ] CHK020 - Is the error response for missing `relativeTo` when placement is `before`/`after` captured in Zod refinement? [Completeness, Contracts/add-folder.ts]
- [ ] CHK021 - Is the refinement error message defined as "relativeTo is required when placement is 'before' or 'after'"? [Clarity, Contracts/add-folder.ts]
- [ ] CHK022 - Is it explicitly stated that `add_folder` does NOT support disambiguation (creates new items, doesn't lookup)? [Clarity, Gap]

## Error Scenarios Coverage - edit_folder

- [ ] CHK023 - Is the error response for folder not found (by ID) specified? [Completeness, Gap]
- [ ] CHK024 - Is the error response for folder not found (by name with zero matches) specified? [Completeness, Gap]
- [ ] CHK025 - Is the disambiguation error response for ambiguous name (multiple matches) specified? [Completeness, Spec §FR-027, Clarification #1]
- [ ] CHK026 - Is the error response for no updates provided (neither newName nor newStatus) captured in Zod refinement? [Completeness, Contracts/edit-folder.ts]
- [ ] CHK027 - Is the refinement error message defined as "At least one of newName or newStatus must be provided"? [Clarity, Contracts/edit-folder.ts]
- [ ] CHK028 - Is the error response for no identifier provided (neither id nor name) captured in Zod refinement? [Completeness, Contracts/edit-folder.ts]
- [ ] CHK029 - Is the refinement error message defined as "Either id or name must be provided to identify the folder"? [Clarity, Contracts/edit-folder.ts]
- [ ] CHK030 - Is the error response for invalid `newStatus` value (not active/dropped) handled by Zod enum validation? [Coverage, Contracts/edit-folder.ts]
- [ ] CHK031 - Is the error response for empty `newName` after trim specified? [Completeness, Contracts/edit-folder.ts]

## Error Scenarios Coverage - remove_folder

- [ ] CHK032 - Is the error response for folder not found (by ID) specified? [Completeness, Gap]
- [ ] CHK033 - Is the error response for folder not found (by name with zero matches) specified? [Completeness, Gap]
- [ ] CHK034 - Is the disambiguation error response for ambiguous name (multiple matches) specified? [Completeness, Spec §FR-027]
- [ ] CHK035 - Is the error response for attempting to remove library (root container) specified? [Completeness, Spec §Clarification #28]
- [ ] CHK036 - Is the error message for library removal defined as "Cannot delete/move library: not a valid folder target"? [Clarity, Spec §Clarification #28]
- [ ] CHK037 - Is the error response for no identifier provided captured in Zod refinement? [Completeness, Contracts/remove-folder.ts]

## Error Scenarios Coverage - move_folder

- [ ] CHK038 - Is the error response for folder not found (by ID) specified? [Completeness, Gap]
- [ ] CHK039 - Is the error response for folder not found (by name with zero matches) specified? [Completeness, Gap]
- [ ] CHK040 - Is the disambiguation error response for ambiguous name (multiple matches) specified? [Completeness, Spec §FR-027]
- [ ] CHK041 - Is the error response for circular move (folder into itself or descendants) specified? [Completeness, Spec §FR-025]
- [ ] CHK042 - Is the error message format for circular move explicitly defined? [Clarity, Gap]
- [ ] CHK043 - Is the error response for invalid `relativeTo` (non-existent folder) specified? [Completeness, Spec §Clarification #11]
- [ ] CHK044 - Is the error response for wrong-parent relativeTo (before/after with sibling in different parent) specified? [Completeness, Spec §Clarification #11]
- [ ] CHK045 - Is the error response for attempting to move library (root container) specified? [Completeness, Spec §Clarification #28]
- [ ] CHK046 - Is the error response for missing `position` (required for move unlike add) implicit from Zod schema (no default)? [Consistency, Spec §Clarification #29]
- [ ] CHK047 - Is the error response for no identifier provided captured in Zod refinement? [Completeness, Contracts/move-folder.ts]

## Error Message Quality Requirements

- [ ] CHK048 - Are error messages required to quote the problematic input value (e.g., "Invalid parentId 'xyz'")? [Clarity, Spec §Clarification #11, #19]
- [ ] CHK049 - Are error messages required to explain why the operation failed (e.g., ": folder not found")? [Clarity, Spec §Clarification #11]
- [ ] CHK050 - Is there guidance on when error messages should suggest corrective action? [Completeness, Gap]
- [ ] CHK051 - Are folder IDs required in "not found" errors for debugging (especially for disambiguation retry)? [Completeness, Gap]
- [ ] CHK052 - Are disambiguation error messages required to explain how many matches were found? [Clarity, Gap]
- [ ] CHK053 - Is the error message format consistent across all tools (same pattern for same error types)? [Consistency, Gap]

## Error Handling Layers Architecture

- [ ] CHK054 - Is it specified that Zod validation errors are caught and formatted consistently before reaching primitives? [Coverage, Gap]
- [ ] CHK055 - Is the OmniJS script error handling pattern (try-catch returning JSON error format) documented? [Coverage, Spec §Clarification #9]
- [ ] CHK056 - Is the JSON error format from OmniJS scripts defined as `{ success: false, error: string }`? [Clarity, Spec §Clarification #9]
- [ ] CHK057 - Is it specified that primitive functions propagate errors without swallowing context? [Coverage, Constitution Principle V]
- [ ] CHK058 - Is it specified how definition handlers transform errors into MCP text content format? [Coverage, Gap]
- [ ] CHK059 - Is the layer boundary between Zod validation, OmniJS execution, and MCP response clearly defined? [Clarity, Gap]
- [ ] CHK060 - Is the error transformation chain documented (OmniJS → primitive → definition → MCP)? [Coverage, Gap]

## Constitution Alignment (Principle V: Error Handling)

- [ ] CHK061 - Is it specified that errors must be caught at every layer (Zod, OmniJS, primitive, definition)? [Completeness, Constitution Principle V]
- [ ] CHK062 - Is it specified that error messages must be actionable (explain problem and solution)? [Clarity, Constitution Principle V]
- [ ] CHK063 - Is it specified that silent failures are prohibited? [Coverage, Constitution Principle V]
- [ ] CHK064 - Is it specified that generic error messages (e.g., "Operation failed") are prohibited? [Clarity, Constitution Principle V]
- [ ] CHK065 - Is there a prohibition against swallowing exceptions without re-throwing or logging? [Coverage, Constitution Principle V]
- [ ] CHK066 - Are transport-level errors (OmniFocus not running) required to produce actionable messages? [Completeness, Spec §Clarification #36]

## Cross-Tool Consistency

- [ ] CHK067 - Is the error schema naming pattern consistent across tools (e.g., `[Tool]ErrorSchema`, `[Tool]DisambiguationSchema`)? [Consistency, Contracts]
- [ ] CHK068 - Is the disambiguation schema only included for tools that support name-based lookup? [Consistency, Contracts]
- [ ] CHK069 - Are tools without disambiguation (list_folders, add_folder) using discriminatedUnion while others use union? [Clarity, Contracts]
- [ ] CHK070 - Is the `success: z.literal(false)` pattern consistent across all error schemas? [Consistency, Contracts]
- [ ] CHK071 - Is the identification error ("Either id or name must be provided") consistent across edit, remove, move tools? [Consistency, Contracts]
- [ ] CHK072 - Is the position validation error message consistent between add_folder and move_folder? [Consistency, Contracts]

## Disambiguation Flow Requirements

- [ ] CHK073 - Is the disambiguation workflow documented (detect code → extract IDs → query details → present choices → retry)? [Completeness, Spec §Clarification #34]
- [ ] CHK074 - Is it clear that `byName()` returns first match but MCP layer adds disambiguation? [Clarity, Spec §Clarification #34]
- [ ] CHK075 - Is the expected AI agent behavior for disambiguation errors documented? [Coverage, Spec §Clarification #34]
- [ ] CHK076 - Is it specified how many matching folders trigger disambiguation (any count > 1)? [Clarity, Gap]

## Edge Cases and Boundary Conditions

- [ ] CHK077 - Is the error behavior for concurrent modifications (folder deleted during operation) addressed? [Coverage, Gap]
- [ ] CHK078 - Is the error behavior for OmniFocus database in inconsistent state addressed? [Coverage, Spec §Assumptions]
- [ ] CHK079 - Is the error behavior for extremely long error messages (truncation policy) addressed? [Clarity, Gap]
- [ ] CHK080 - Is the error response for permission issues (if OmniFocus denies access) addressed? [Coverage, Gap]

---

## Notes

- Check items off as completed: `[x]`
- Items marked `[Gap]` indicate potential missing requirements that should be added to spec
- Items marked `[Contracts/*]` reference specific Zod schema files
- Constitution Principle V: "Error Handling: Errors caught at every layer, error messages are actionable and informative"
- Total items: 80 (testing requirements quality, not implementation behavior)
