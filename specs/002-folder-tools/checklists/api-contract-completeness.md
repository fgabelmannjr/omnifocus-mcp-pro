# API Contract Completeness Checklist: Folder Management Tools

**Purpose**: Validate contract files are implementation-ready for all five
folder management MCP tools
**Created**: 2025-12-10
**Feature**: [spec.md](../spec.md), [data-model.md](../data-model.md)

**Note**: Validates contracts in `specs/002-folder-tools/contracts/*.ts`
against spec.md and data-model.md. Focus: can implementation proceed with
only the contract file as reference?

## Tool Definition - list_folders

- [ ] CHK001 Tool name uses MCP lowercase_underscore convention [Clarity]
- [ ] CHK002 Description explains listing with optional filtering [Clarity]
- [ ] CHK003 `status` parameter has description with enum values [Clarity]
- [ ] CHK004 `parentId` parameter has description with null semantics [Clarity]
- [ ] CHK005 `includeChildren` parameter has default value documented [Gap]
- [ ] CHK006 All parameters clearly marked optional with `?` [Completeness]

## Tool Definition - add_folder

- [ ] CHK007 Tool name uses MCP lowercase_underscore convention [Clarity]
- [ ] CHK008 Description explains folder creation at position [Clarity]
- [ ] CHK009 Contrasts with move_folder for hierarchy changes [Gap]
- [ ] CHK010 `name` parameter has non-empty requirement documented [Clarity]
- [ ] CHK011 `position` parameter has default behavior documented [Clarity]
- [ ] CHK012 Required vs optional parameters clearly distinguished [Clarity]

## Tool Definition - edit_folder

- [ ] CHK013 Tool name uses MCP lowercase_underscore convention [Clarity]
- [ ] CHK014 Description explains partial update semantics [Clarity]
- [ ] CHK015 Contrasts with move_folder for position changes [Gap]
- [ ] CHK016 Identification fields (id, name) have precedence documented [Clarity]
- [ ] CHK017 Update fields (newName, newStatus) have prefix explained [Gap]
- [ ] CHK018 Parameter constraints documented (one of each pair) [Clarity]

## Tool Definition - remove_folder

- [ ] CHK019 Tool name uses MCP lowercase_underscore convention [Clarity]
- [ ] CHK020 Description explains recursive deletion behavior [Clarity]
- [ ] CHK021 Identification fields have precedence documented [Clarity]
- [ ] CHK022 No force parameter - matches native OF behavior noted [Clarity]
- [ ] CHK023 Required identification (id|name) clearly stated [Completeness]

## Tool Definition - move_folder

- [ ] CHK024 Tool name uses MCP lowercase_underscore convention [Clarity]
- [ ] CHK025 Description explains hierarchy relocation [Clarity]
- [ ] CHK026 Contrasts with edit_folder for property changes [Gap]
- [ ] CHK027 `position` marked as required (no default) [Clarity]
- [ ] CHK028 Identification fields have precedence documented [Clarity]
- [ ] CHK029 Circular move prevention documented [Gap]

## Input Schema - Position Conditional Validation

- [ ] CHK030 `placement: 'before'` requires `relativeTo` documented [Spec §FR-010]
- [ ] CHK031 `placement: 'after'` requires `relativeTo` documented [Spec §FR-010]
- [ ] CHK032 `placement: 'beginning'` has optional `relativeTo` [Spec §FR-010]
- [ ] CHK033 `placement: 'ending'` has optional `relativeTo` [Spec §FR-010]
- [ ] CHK034 Zod `.refine()` implements conditional requirement [Consistency]
- [ ] CHK035 Error message specifies which field is invalid [Clarity]
- [ ] CHK036 Library root default (omit relativeTo) documented [Spec §FR-010]

## Input Schema - Folder Identification

- [ ] CHK037 `id` takes precedence over `name` documented [Spec §15]
- [ ] CHK038 At least one identifier required validation exists [Completeness]
- [ ] CHK039 Zod `.refine()` enforces id|name requirement [Consistency]
- [ ] CHK040 Error message for missing identifier is clear [Clarity]
- [ ] CHK041 Case-sensitive matching for name documented [Spec §4]

## Input Schema - list_folders Filters

- [ ] CHK042 `status` filter with enum values defined [Spec §FR-004]
- [ ] CHK043 `parentId` + `includeChildren:true` behavior documented [Spec §FR-006]
- [ ] CHK044 `parentId` + `includeChildren:false` behavior documented [Spec §FR-006]
- [ ] CHK045 Omitted `parentId` + `includeChildren:true` behavior [Spec §FR-006]
- [ ] CHK046 Omitted `parentId` + `includeChildren:false` behavior [Spec §FR-006]
- [ ] CHK047 Default `includeChildren: true` specified [data-model.md]

## Input Schema - edit_folder Partial Updates

- [ ] CHK048 At least one update field required validation [Spec §FR-015a]
- [ ] CHK049 `newName` and `newStatus` both optional individually [Clarity]
- [ ] CHK050 Zod `.refine()` enforces update field requirement [Consistency]
- [ ] CHK051 `newName` trim transform documented [Spec §17]
- [ ] CHK052 `newStatus` enum values match data-model [Consistency]

## Input Schema - Edge Cases

- [ ] CHK053 Empty name rejection documented (after trim) [Spec §17]
- [ ] CHK054 Invalid ID handling documented (not found) [Spec §Edge Cases]
- [ ] CHK055 Circular move detection for move_folder [Spec §FR-025]
- [ ] CHK056 Invalid relativeTo handling documented [Spec §11]
- [ ] CHK057 Invalid parentId handling documented [Spec §19]
- [ ] CHK058 Library root operation rejection documented [Spec §28]

## Response Schema - Success Structures

- [ ] CHK059 list_folders: `{ success, folders[] }` defined [Spec §FR-002]
- [ ] CHK060 add_folder: `{ success, id, name }` defined [Spec §FR-011a]
- [ ] CHK061 edit_folder: `{ success, id, name }` defined [Spec §FR-016]
- [ ] CHK062 remove_folder: `{ success, id, name }` defined [Spec §FR-019]
- [ ] CHK063 move_folder: `{ success, id, name }` defined [Spec §FR-026]

## Response Schema - Folder Entity

- [ ] CHK064 FolderSchema includes `id: string` [data-model.md]
- [ ] CHK065 FolderSchema includes `name: string` [data-model.md]
- [ ] CHK066 FolderSchema includes `status` enum [data-model.md]
- [ ] CHK067 FolderSchema includes `parentId: string|null` [data-model.md]
- [ ] CHK068 All fields have `.describe()` documentation [Clarity]

## Response Schema - Error Structures

- [ ] CHK069 Standard error `{ success: false, error: string }` [Spec §FR-028]
- [ ] CHK070 Disambiguation error includes `code` field [Spec §FR-027]
- [ ] CHK071 Disambiguation error includes `matchingIds` array [Spec §FR-027]
- [ ] CHK072 `code` value is literal `'DISAMBIGUATION_REQUIRED'` [Spec §34]
- [ ] CHK073 z.union or discriminatedUnion covers all response types [Consistency]

## Response Schema - Error Scenarios Mapped

- [ ] CHK074 "Folder not found" maps to standard error [Completeness]
- [ ] CHK075 "Invalid parentId" maps to standard error [Completeness]
- [ ] CHK076 "Invalid relativeTo" maps to standard error [Completeness]
- [ ] CHK077 "Circular move" maps to standard error [Completeness]
- [ ] CHK078 "Empty name" maps to standard error [Completeness]
- [ ] CHK079 "Multiple name matches" maps to disambiguation [Completeness]
- [ ] CHK080 "Library operation" maps to standard error [Completeness]

## Schema-to-Spec Alignment - Functional Requirements

- [ ] CHK081 list_folders schema matches FR-001 to FR-006 [Consistency]
- [ ] CHK082 add_folder schema matches FR-007 to FR-011a [Consistency]
- [ ] CHK083 edit_folder schema matches FR-012 to FR-016 [Consistency]
- [ ] CHK084 remove_folder schema matches FR-017 to FR-020 [Consistency]
- [ ] CHK085 move_folder schema matches FR-021 to FR-026 [Consistency]

## Schema-to-Spec Alignment - Data Model

- [ ] CHK086 FolderSchema matches data-model Folder entity [Consistency]
- [ ] CHK087 PositionSchema matches data-model Position entity [Consistency]
- [ ] CHK088 Position mapping table in data-model has schema parity [Consistency]
- [ ] CHK089 Status enum values match Folder.Status in data-model [Consistency]
- [ ] CHK090 Error codes in data-model match schema definitions [Consistency]

## Schema-to-Spec Alignment - Position System

- [ ] CHK091 Position requirement rules match spec clarification #33 [Consistency]
- [ ] CHK092 `relativeTo` conditional logic matches data-model rules [Consistency]
- [ ] CHK093 add_folder position default matches FR-010 [Consistency]
- [ ] CHK094 move_folder position required matches FR-023 [Consistency]
- [ ] CHK095 Position mapping to Omni Automation documented [Completeness]

## Schema-to-Spec Alignment - Error Responses

- [ ] CHK096 Disambiguation error matches clarification #34 [Consistency]
- [ ] CHK097 Standard error matches clarification #9 [Consistency]
- [ ] CHK098 Error codes table in data-model covers all scenarios [Completeness]
- [ ] CHK099 Error message patterns are consistent across tools [Consistency]

## Implementation Readiness

- [ ] CHK100 Type exports provided for all input/output types [Completeness]
- [ ] CHK101 Schema exports provided for runtime validation [Completeness]
- [ ] CHK102 Zod version compatibility documented (4.1.x) [Gap]
- [ ] CHK103 No external dependencies beyond Zod [Consistency]
- [ ] CHK104 Contract file header comments describe tool purpose [Clarity]
- [ ] CHK105 Contract follows existing codebase patterns [Consistency]

## Notes

- Check items off as completed: `[x]`
- `[Gap]` indicates missing specification that may need addition
- `[Spec §X]` references clarification numbers in spec.md
- `[Consistency]` checks alignment between artifacts
- `[Clarity]` checks documentation completeness
- `[Completeness]` checks coverage of requirements
