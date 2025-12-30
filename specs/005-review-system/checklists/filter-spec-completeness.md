# Filter Specification Completeness Checklist

**Purpose**: Validate that filter combinations and edge cases for `get_projects_for_review` are fully specified in requirements documentation.

**Created**: 2025-12-30
**Scope**: `get_projects_for_review` tool - 6 interacting filter parameters
**Audience**: Requirements author, PR reviewer
**Depth**: Comprehensive (filter interactions are high-risk for underspecification)

**Target Documents**:

- spec.md (FR-001 to FR-011, Filter Behavior table)
- data-model.md (filter logic)
- contracts/get-projects-for-review.ts (schema)
- plan.md (filter implementation)
- quickstart.md (code examples)

---

## Section 1: Parameter Specification Quality

### 1.1 Type and Default Completeness

- [ ] CHK001 - Is the `includeFuture` parameter type explicitly specified as boolean? [Completeness, Spec §FR-002]
- [ ] CHK002 - Is the `includeFuture` default value documented as `false`? [Completeness, Spec §Filter Behavior]
- [ ] CHK003 - Is the `futureDays` parameter type explicitly specified as number? [Completeness, Spec §FR-003]
- [ ] CHK004 - Is the `futureDays` default value documented as `7`? [Completeness, Spec §Filter Behavior]
- [ ] CHK005 - Is the `folderId` parameter type explicitly specified as string? [Completeness, Spec §FR-004]
- [ ] CHK006 - Is the `folderId` optionality documented (no default, truly optional)? [Completeness, Spec §Filter Behavior]
- [ ] CHK007 - Is the `includeAll` parameter type explicitly specified as boolean? [Completeness, Spec §FR-005]
- [ ] CHK008 - Is the `includeAll` default value documented as `false`? [Completeness, Spec §Filter Behavior]
- [ ] CHK009 - Is the `includeInactive` parameter type explicitly specified as boolean? [Completeness, Spec §FR-006]
- [ ] CHK010 - Is the `includeInactive` default value documented as `false`? [Completeness, Spec §Filter Behavior]
- [ ] CHK011 - Is the `limit` parameter type explicitly specified as number? [Completeness, Spec §FR-010]
- [ ] CHK012 - Is the `limit` default value documented as `50`? [Completeness, Spec §Filter Behavior]

### 1.2 Valid Value Ranges

- [ ] CHK013 - Is the valid range for `limit` specified as 1-200? [Clarity, Spec §FR-010]
- [ ] CHK014 - Is the minimum `futureDays` value specified (≥1)? [Gap]
- [ ] CHK015 - Is the maximum `futureDays` value specified or documented as unlimited? [Gap]
- [ ] CHK016 - Are `folderId` format requirements specified (OmniFocus ID format)? [Clarity, Gap]

### 1.3 Boolean Semantics

- [ ] CHK017 - Is the meaning of `includeFuture: true` explicitly defined? [Clarity, Spec §FR-002]
- [ ] CHK018 - Is the meaning of `includeFuture: false` explicitly defined (only today and earlier)? [Clarity]
- [ ] CHK019 - Is the meaning of `includeAll: true` explicitly defined (all reviewable projects)? [Clarity, Spec §FR-005]
- [ ] CHK020 - Is the meaning of `includeAll: false` explicitly defined (date-based filtering)? [Clarity]
- [ ] CHK021 - Is the meaning of `includeInactive: true` explicitly defined (includes Done/Dropped)? [Clarity, Spec §FR-006]
- [ ] CHK022 - Is the meaning of `includeInactive: false` explicitly defined (excludes Done/Dropped)? [Clarity]

---

## Section 2: Filter Combination Logic

### 2.1 AND Logic Specification

- [ ] CHK023 - Is the AND combination logic explicitly documented for all filters? [Clarity, Spec §Filter Behavior]
- [ ] CHK024 - Is it clear that projects must satisfy ALL specified filters? [Clarity]
- [ ] CHK025 - Is the cumulative/non-exclusive nature of filters documented? [Clarity]

### 2.2 Default Behavior (No Filters)

- [ ] CHK026 - Is the default behavior explicitly defined (overdue + due today)? [Completeness]
- [ ] CHK027 - Is the default sort order specified (nextReviewDate ascending)? [Completeness, Spec §FR-008]
- [ ] CHK028 - Is the default limit applied (50) documented? [Completeness, Spec §FR-010]
- [ ] CHK029 - Is it clear that reviewInterval=null projects are always excluded? [Clarity, Spec §FR-007]

---

## Section 3: includeFuture + futureDays Interaction

### 3.1 Dependency Relationship

- [ ] CHK030 - Is it documented that `futureDays` only applies when `includeFuture=true`? [Clarity, Spec §FR-003]
- [ ] CHK031 - Is the meaning of `futureDays=7` specified ("up to 7 days in the future")? [Clarity]
- [ ] CHK032 - Is the boundary inclusivity specified (is day 7 included or excluded)? [Ambiguity, Gap]
- [ ] CHK033 - Is the behavior documented when `futureDays` is provided but `includeFuture=false`? [Gap]
- [ ] CHK034 - Is the behavior "futureDays ignored" vs "validation error" for mismatch specified? [Gap]

### 3.2 Edge Cases

- [ ] CHK035 - Is behavior specified for `futureDays=0`? [Edge Case, Gap]
- [ ] CHK036 - Is behavior specified for `futureDays=1` (only tomorrow)? [Edge Case]
- [ ] CHK037 - Is behavior specified for very large `futureDays` (e.g., 365)? [Edge Case, Gap]
- [ ] CHK038 - Is the calculation basis documented (midnight of each day)? [Gap]

---

## Section 4: includeAll Behavior

### 4.1 Override Semantics

- [ ] CHK039 - Is it documented that `includeAll=true` overrides date-based filtering? [Clarity, Spec §FR-005]
- [ ] CHK040 - Is it documented that `includeAll=true` still respects `folderId` filter? [Clarity, Gap]
- [ ] CHK041 - Is it documented that `includeAll=true` still respects `includeInactive` filter? [Clarity, Gap]
- [ ] CHK042 - Is it documented that `includeAll=true` still excludes `reviewInterval=null`? [Clarity, Gap]

### 4.2 Combination Interactions

- [ ] CHK043 - Is the precedence documented when `includeAll=true` + `includeFuture=true`? [Ambiguity, Gap]
- [ ] CHK044 - Is the expected result documented for `includeAll=true` + `folderId` (all reviewable in folder)? [Gap]
- [ ] CHK045 - Is it clear that `includeAll` is about date filtering, not other filters? [Clarity]

---

## Section 5: includeInactive Behavior

### 5.1 Status Filtering

- [ ] CHK046 - Are the specific statuses included by `includeInactive=true` documented? [Completeness]
- [ ] CHK047 - Is "Done" explicitly listed as included when `includeInactive=true`? [Completeness]
- [ ] CHK048 - Is "Dropped" explicitly listed as included when `includeInactive=true`? [Completeness]
- [ ] CHK049 - Is "On Hold" status handling documented (is it considered "inactive")? [Ambiguity, Gap]
- [ ] CHK050 - Is it documented that inactive projects with `reviewInterval` are included? [Clarity]

### 5.2 Combination Interactions

- [ ] CHK051 - Is behavior documented for `includeInactive=false` + `includeAll=true`? [Gap]
- [ ] CHK052 - Is it clear that `includeInactive` combines via AND with other filters? [Clarity]

---

## Section 6: folderId Filter Behavior

### 6.1 Hierarchy Scoping

- [ ] CHK053 - Is recursive folder scoping documented (includes all nested subfolders)? [Clarity, Spec §FR-004]
- [ ] CHK054 - Is it clear that projects at any depth within the folder are included? [Clarity]
- [ ] CHK055 - Is direct children only vs. all descendants behavior explicitly specified? [Ambiguity]

### 6.2 Error Handling

- [ ] CHK056 - Is behavior specified for invalid/non-existent `folderId`? [Edge Case, Gap]
- [ ] CHK057 - Is error response format documented for invalid folder? [Completeness, Spec §Error Messages]
- [ ] CHK058 - Is behavior specified for explicitly passing `folderId: null`? [Edge Case, Gap]
- [ ] CHK059 - Is behavior specified for empty string `folderId: ""`? [Edge Case, Gap]

### 6.3 Combination Interactions

- [ ] CHK060 - Is `folderId` + `includeAll` combination behavior documented? [Gap]
- [ ] CHK061 - Is `folderId` + `includeInactive` combination behavior documented? [Gap]
- [ ] CHK062 - Is `folderId` + all boolean filters combination behavior documented? [Gap]

---

## Section 7: limit Parameter Behavior

### 7.1 Application Order

- [ ] CHK063 - Is it documented that `limit` is applied post-filter (after all other filters)? [Clarity, Gap]
- [ ] CHK064 - Is the order of operations documented (filter → sort → limit)? [Clarity, Gap]

### 7.2 Boundary Handling

- [ ] CHK065 - Is behavior specified for `limit < 1` (validation error or clamp)? [Edge Case, Gap]
- [ ] CHK066 - Is behavior specified for `limit > 200` (validation error or clamp)? [Edge Case, Gap]
- [ ] CHK067 - Is behavior specified for `limit = 0`? [Edge Case, Gap]
- [ ] CHK068 - Is behavior specified for non-integer `limit` (e.g., 50.5)? [Edge Case, Gap]
- [ ] CHK069 - Is validation error message format documented for invalid `limit`? [Gap]

---

## Section 8: Sort Order Specification

### 8.1 Primary Sort

- [ ] CHK070 - Is the sort order explicitly documented (nextReviewDate ascending)? [Completeness, Spec §FR-008]
- [ ] CHK071 - Is "most overdue first" semantics clearly stated? [Clarity]
- [ ] CHK072 - Is sort order consistent across all filter modes? [Consistency, Gap]

### 8.2 Secondary Sort

- [ ] CHK073 - Is secondary sort defined when nextReviewDate is identical? [Gap]
- [ ] CHK074 - Is sort stability documented (consistent ordering across calls)? [Gap]

---

## Section 9: totalCount Field Specification

### 9.1 Count Semantics

- [ ] CHK075 - Is `totalCount` field documented in response? [Completeness, Spec §FR-011]
- [ ] CHK076 - Is it documented that `totalCount` is count BEFORE limit is applied? [Clarity, Gap]
- [ ] CHK077 - Is pagination support implied by `totalCount + limit` explicitly documented? [Gap]
- [ ] CHK078 - Is `totalCount` consistently returned even when results are 0? [Consistency, Gap]

---

## Section 10: Response Behavior Specification

### 10.1 Empty Results

- [ ] CHK079 - Is behavior documented for zero matching projects? [Edge Case, Gap]
- [ ] CHK080 - Is it clear that zero results returns empty array, not error? [Clarity, Gap]
- [ ] CHK081 - Is `success: true` specified for zero-result responses? [Completeness, Gap]

### 10.2 Partial Results

- [ ] CHK082 - Is behavior documented when results exactly equal limit? [Edge Case, Gap]
- [ ] CHK083 - Is behavior documented when more projects exist than limit? [Completeness]

---

## Section 11: Schema Validation

### 11.1 Zod Schema Requirements

- [ ] CHK084 - Are all 6 filter parameters specified in Zod schema? [Traceability, Gap - contracts not yet created]
- [ ] CHK085 - Are default values applied by schema documented? [Consistency, Gap]
- [ ] CHK086 - Are type coercions documented (string "true" → boolean true)? [Gap]
- [ ] CHK087 - Are refinements for invalid combinations specified? [Gap]

### 11.2 Schema-to-Spec Alignment

- [ ] CHK088 - Are all spec filter parameters reflected in schema definition? [Consistency, Gap]
- [ ] CHK089 - Do schema defaults match spec defaults exactly? [Consistency, Gap]
- [ ] CHK090 - Are edge case behaviors in spec matched by schema refinements? [Consistency, Gap]

---

## Section 12: Filter Combination Edge Cases Matrix

### 12.1 Two-Parameter Combinations

- [ ] CHK091 - Is `includeFuture=false` + `futureDays=14` behavior specified (ignored)? [Edge Case, Gap]
- [ ] CHK092 - Is `includeAll=true` + `includeFuture=true` precedence documented? [Edge Case, Gap]
- [ ] CHK093 - Is `includeAll=true` + `includeInactive=false` interaction documented? [Edge Case, Gap]
- [ ] CHK094 - Is `folderId` + `includeAll=true` combination documented? [Edge Case, Gap]

### 12.2 Multi-Parameter Combinations

- [ ] CHK095 - Are all filter combinations explicitly tested in acceptance scenarios? [Coverage, Gap]
- [ ] CHK096 - Is a filter combination truth table provided? [Clarity, Gap]
- [ ] CHK097 - Are common GTD use cases mapped to filter combinations? [Usability, Gap]

---

## Section 13: reviewInterval=null Exclusion

### 13.1 Universal Exclusion

- [ ] CHK098 - Is reviewInterval=null exclusion documented as applying to ALL modes? [Clarity, Spec §FR-007]
- [ ] CHK099 - Is it clear that includeAll=true still excludes reviewInterval=null? [Consistency]
- [ ] CHK100 - Is the rationale documented (not reviewable, no nextReviewDate)? [Clarity]

---

## Section 14: Cross-Document Consistency

### 14.1 Spec-to-Plan Alignment

- [ ] CHK101 - Do filter descriptions in spec match implementation approach in plan? [Consistency, Gap - plan.md not created]
- [ ] CHK102 - Are filter default values consistent between spec and plan? [Consistency, Gap]

### 14.2 Spec-to-Contract Alignment

- [ ] CHK103 - Do all 6 spec filter parameters appear in contract schema? [Consistency, Gap - contracts not created]
- [ ] CHK104 - Are parameter types identical between spec and contract? [Consistency, Gap]

### 14.3 Examples-to-Spec Alignment

- [ ] CHK105 - Do quickstart examples demonstrate all filter parameters? [Coverage, Gap - quickstart.md not created]
- [ ] CHK106 - Are example behaviors consistent with spec definitions? [Consistency, Gap]

---

## Summary

| Section | Items | Focus |
|---------|-------|-------|
| 1. Parameter Specification | CHK001-CHK022 | Types, defaults, ranges |
| 2. Filter Combination Logic | CHK023-CHK029 | AND logic, defaults |
| 3. includeFuture+futureDays | CHK030-CHK038 | Dependency, boundaries |
| 4. includeAll Behavior | CHK039-CHK045 | Override semantics |
| 5. includeInactive Behavior | CHK046-CHK052 | Status filtering |
| 6. folderId Filter | CHK053-CHK062 | Hierarchy, errors |
| 7. limit Parameter | CHK063-CHK069 | Application order, boundaries |
| 8. Sort Order | CHK070-CHK074 | Primary, secondary |
| 9. totalCount Field | CHK075-CHK078 | Pagination support |
| 10. Response Behavior | CHK079-CHK083 | Empty/partial results |
| 11. Schema Validation | CHK084-CHK090 | Zod schema alignment |
| 12. Combination Edge Cases | CHK091-CHK097 | Filter interaction matrix |
| 13. reviewInterval Exclusion | CHK098-CHK100 | Universal exclusion |
| 14. Cross-Document | CHK101-CHK106 | Multi-document consistency |

**Total Items**: 106

**Key Risk Areas**:

1. **futureDays boundary inclusivity** (CHK032) - Ambiguous, could cause off-by-one errors
2. **includeAll override scope** (CHK040-CHK044) - Underspecified filter interactions
3. **limit boundary handling** (CHK065-CHK068) - Error vs. clamp behavior undefined
4. **Sort stability** (CHK074) - May cause non-deterministic results
5. **On Hold status** (CHK049) - Ambiguous "inactive" definition

**Note**: Items marked `[Gap]` for plan.md, contracts/*.ts, and quickstart.md are pending those files being created via `/speckit.plan`.
