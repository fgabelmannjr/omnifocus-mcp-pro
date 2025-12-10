# Data Model: Folder Management Tools

**Feature Branch**: `002-folder-tools`
**Date**: 2025-12-10

## Entity Definitions

### Folder

Represents a folder in the OmniFocus database hierarchy.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | `string` | `folder.id.primaryKey` | Unique identifier (Omni Automation ObjectIdentifier) |
| `name` | `string` | `folder.name` | Display name (1+ chars after trim) |
| `status` | `'active' \| 'dropped'` | `folder.status` | Folder state |
| `parentId` | `string \| null` | `folder.parent?.id.primaryKey` | Parent folder ID (null for root) |

### Folder.Status (Enum)

Maps to Omni Automation `Folder.Status` enumeration.

| MCP Value | Omni Automation | Description |
|-----------|-----------------|-------------|
| `'active'` | `Folder.Status.Active` | Folder is active and visible |
| `'dropped'` | `Folder.Status.Dropped` | Folder is archived/hidden |

### Position

Specifies insertion location for create/move operations. Maps directly to Omni Automation `Folder.ChildInsertionLocation`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `placement` | `'before' \| 'after' \| 'beginning' \| 'ending'` | Yes | Position type |
| `relativeTo` | `string` | Conditional | Folder ID reference |

**Requirement Rules**:
- `placement: 'before'` or `'after'`: `relativeTo` is **REQUIRED** (sibling folder ID)
- `placement: 'beginning'` or `'ending'`: `relativeTo` is **OPTIONAL** (parent folder ID; omit for library root)

### Position Mapping

| MCP Position | Omni Automation Expression |
|--------------|---------------------------|
| `{ placement: "beginning" }` | `library.beginning` |
| `{ placement: "ending" }` | `library.ending` |
| `{ placement: "beginning", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").beginning` |
| `{ placement: "ending", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").ending` |
| `{ placement: "before", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").before` |
| `{ placement: "after", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").after` |

## Response Schemas

### Success Response

All mutable operations return consistent success structure:

```typescript
interface SuccessResponse {
  success: true;
  id: string;      // Folder's primaryKey
  name: string;    // Folder's current name
}
```

### List Response

```typescript
interface ListFoldersResponse {
  success: true;
  folders: Folder[];
}
```

### Error Response (Standard)

```typescript
interface ErrorResponse {
  success: false;
  error: string;   // Human-readable error message
}
```

### Error Response (Disambiguation)

```typescript
interface DisambiguationErrorResponse {
  success: false;
  error: string;
  code: 'DISAMBIGUATION_REQUIRED';
  matchingIds: string[];
}
```

## Input Schemas by Tool

### list_folders

```typescript
interface ListFoldersInput {
  status?: 'active' | 'dropped';    // Filter by status
  parentId?: string;                 // Filter by parent (null = root)
  includeChildren?: boolean;         // Recursive (default: true)
}
```

**Behavior Matrix**:

| parentId | includeChildren | Result |
|----------|-----------------|--------|
| omitted | omitted/true | All folders via `flattenedFolders` |
| omitted | false | Top-level only via `database.folders` |
| specified | omitted/true | Recursive children via `folder.flattenedFolders` |
| specified | false | Immediate children via `folder.folders` |

### add_folder

```typescript
interface AddFolderInput {
  name: string;                      // Required, non-empty after trim
  position?: Position;               // Default: { placement: "ending" }
}
```

### edit_folder

```typescript
interface EditFolderInput {
  id?: string;                       // Folder identifier (precedence)
  name?: string;                     // Folder name lookup (fallback)
  newName?: string;                  // New name to set
  newStatus?: 'active' | 'dropped';  // New status to set
}
```

**Validation Rules**:
- At least one of `id` or `name` required for identification
- At least one of `newName` or `newStatus` required for update
- If `name` matches multiple, return disambiguation error

### remove_folder

```typescript
interface RemoveFolderInput {
  id?: string;                       // Folder identifier (precedence)
  name?: string;                     // Folder name lookup (fallback)
}
```

**Behavior**:
- Recursive deletion (folder + all contents)
- Returns ID/name captured before deletion

### move_folder

```typescript
interface MoveFolderInput {
  id?: string;                       // Folder identifier (precedence)
  name?: string;                     // Folder name lookup (fallback)
  position: Position;                // Required - no default
}
```

**Validation Rules**:
- Position is required (unlike add_folder)
- Circular move detection: cannot move folder into its own descendants

## Validation Rules

### Folder Name
1. Trim leading/trailing whitespace
2. Reject if trimmed length is 0
3. No character restrictions (emoji, unicode supported)
4. No length limit

### Folder Identification
1. If `id` provided: use `Folder.byIdentifier(id)`
2. If only `name` provided: search `flattenedFolders.filter(f => f.name === name)`
3. If multiple matches: return disambiguation error with all IDs
4. If no matches: return "folder not found" error

### Position Validation
1. For `before`/`after`: `relativeTo` must be provided
2. For `beginning`/`ending`: `relativeTo` optional (defaults to library)
3. Validate `relativeTo` folder exists before operation
4. For move: validate not moving into descendant (circular)

## State Transitions

### Folder Status

```
┌──────────┐                      ┌──────────┐
│  Active  │ ←──edit_folder────→  │ Dropped  │
└──────────┘   (newStatus)        └──────────┘
```

- No cascade: Setting folder to dropped does NOT affect children's status
- `effectiveActive` (computed by OmniFocus) considers ancestor chain
- Only `status` property is modified by edit_folder

### Folder Hierarchy

```
Library (root)
├── Folder A
│   ├── Folder A1
│   └── Folder A2
└── Folder B

Operations:
- add_folder: Insert at any position
- move_folder: Relocate maintaining subtree
- remove_folder: Delete with entire subtree
```

## Error Codes

| Code | Trigger | Response Field |
|------|---------|----------------|
| `DISAMBIGUATION_REQUIRED` | Name matches multiple folders | `matchingIds` array |
| (none) | Folder not found | `error` message |
| (none) | Invalid parentId | `error` message |
| (none) | Invalid relativeTo | `error` message |
| (none) | Circular move | `error` message |
| (none) | Empty name | `error` message |
| (none) | Library operation | `error` message |
