# Implementation Plan: Review System

**Branch**: `005-review-system` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-review-system/spec.md`

## Summary

The Review System provides three MCP tools for managing OmniFocus's GTD-style
periodic project review workflow. Reviews are core GTD practice ensuring projects
remain relevant and actionable.

**Primary Requirements:**
- `get_projects_for_review`: Query projects due for review with filtering
- `mark_reviewed`: Advance `nextReviewDate` by the configured interval
- `set_review_interval`: Configure review frequency (or disable reviews)

**Technical Approach:**
- All operations use pure OmniJS via `executeOmniFocusScript()`
- Date calculations use Calendar/DateComponents API (not millisecond math)
- Critical constraint: No `markReviewed()` method exists—must set `nextReviewDate` directly
- `lastReviewDate` is READ-ONLY; `nextReviewDate` is WRITABLE

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.24.x, Zod 4.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with V8 coverage
**Target Platform**: macOS (OmniFocus Pro with Omni Automation)
**Project Type**: Single project (established MCP server structure)
**Performance Goals**: <500ms for databases with 500+ projects (SC-001)
**Constraints**: OmniFocus 3.11+ required (reviewInterval property), 3.0+ for Calendar API
**Scale/Scope**: GTD practitioners managing 10-500 projects

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | ✅ PASS | Zod schemas for all inputs (FR-001 through FR-036), TypeScript strict mode |
| II. Separation of Concerns | ✅ PASS | Definitions in `definitions/`, primitives in `primitives/`, shared contracts |
| III. Script Execution Safety | ✅ PASS | All OmniJS wrapped in try-catch with JSON error returns |
| IV. Structured Data Contracts | ✅ PASS | Discriminated unions for responses, per-item batch results |
| V. Defensive Error Handling | ✅ PASS | Partial failures don't fail batch, actionable error messages |
| VI. Build Discipline | ✅ PASS | Standard `pnpm build` workflow, no OmniJS script files to copy |
| VII. KISS | ✅ PASS | Follows established patterns from Phase 4, no over-engineering |
| VIII. YAGNI | ✅ PASS | Only spec'd requirements, no extras |
| IX. SOLID | ✅ PASS | Single responsibility per file, definitions/primitives separation |
| X. TDD | ✅ PASS | Contract tests → Unit tests → Implementation → Manual verification |

**Violations Requiring Justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/005-review-system/
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (API research) ✅ COMPLETE
├── plan.md              # This file ✅
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (OmniJS patterns)
├── contracts/           # Phase 1 output (Zod schemas reference)
├── checklists/          # Requirements and validation checklists ✅ EXISTS
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── review-tools/              # NEW - Zod schemas
│       ├── shared/
│       │   ├── review-project.ts  # ReviewProjectSummarySchema
│       │   ├── batch.ts           # Batch identifier/result schemas
│       │   └── index.ts
│       ├── get-projects-for-review.ts
│       ├── mark-reviewed.ts
│       ├── set-review-interval.ts
│       └── index.ts
├── tools/
│   ├── definitions/
│   │   ├── getProjectsForReview.ts   # NEW
│   │   ├── markReviewed.ts           # NEW
│   │   └── setReviewInterval.ts      # NEW
│   └── primitives/
│       ├── getProjectsForReview.ts   # NEW
│       ├── markReviewed.ts           # NEW
│       └── setReviewInterval.ts      # NEW
└── server.ts                         # Tool registration

tests/
├── contract/
│   └── review-tools/              # NEW
│       ├── get-projects-for-review.test.ts
│       ├── mark-reviewed.test.ts
│       ├── set-review-interval.test.ts
│       └── shared-schemas.test.ts
├── unit/
│   └── review-tools/              # NEW
│       ├── getProjectsForReview.test.ts
│       ├── markReviewed.test.ts
│       └── setReviewInterval.test.ts
└── integration/
    └── review-tools/              # NEW
        └── review-workflow.integration.test.ts
```

**Structure Decision**: Single project layout following established Phase 4 patterns.
Contracts in `src/contracts/review-tools/`, following `project-tools/` and `tag-tools/`
organization with `shared/` subdirectory for reusable schemas.

## Implementation Strategy

### Key OmniJS Patterns (from research.md)

**Date Calculation (CRITICAL):**
```javascript
// CORRECT: Use Calendar/DateComponents API
var today = Calendar.current.startOfDay(new Date());
var dc = new DateComponents();
dc.week = project.reviewInterval.steps;  // For weekly intervals
project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);

// WRONG: Millisecond math fails for months/years
var ms = steps * 30 * 24 * 60 * 60 * 1000;  // ❌ Don't do this
```

**DateComponents Unit Mapping:**
| reviewInterval.unit | DateComponents property |
|---------------------|------------------------|
| `'days'`            | `dc.day`               |
| `'weeks'`           | `dc.week`              |
| `'months'`          | `dc.month`             |
| `'years'`           | `dc.year`              |

**ReviewInterval Value Object Semantics:**
```javascript
// WRONG: Property modification doesn't work
project.reviewInterval.steps = 2;  // ❌ Modifies local copy only

// CORRECT: Full reassignment required
project.reviewInterval = { steps: 2, unit: 'weeks' };  // ✓
```

### Reusable Schemas

The following schemas from `project-tools/shared/project.ts` will be reused:
- `ReviewIntervalSchema` - Already defines steps/unit structure
- `ReviewUnitSchema` - Enum of valid units
- `ProjectStatusSchema` - Status enum for filtering

### Batch Operation Pattern

Following established pattern from `tag-tools/shared/batch-result.ts`:
- Per-item results at original array indices
- Partial failures don't fail entire batch
- Disambiguation errors include `candidates` array

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase Completion Criteria

### Phase 0: Research ✅ COMPLETE
- [x] API research documented in research.md
- [x] All unknowns resolved
- [x] OmniFocus API constraints identified
- [x] Date calculation patterns documented

### Phase 1: Design & Contracts ✅ COMPLETE
- [x] data-model.md with entity definitions
- [x] contracts/ with Zod schemas (6 files in src/contracts/review-tools/)
- [x] quickstart.md with OmniJS patterns
- [x] Agent context updated

**Post-Design Constitution Re-Check** (2025-12-30):
| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First | ✅ PASS | All contracts use Zod schemas, strict TypeScript |
| II. Separation | ✅ PASS | Contracts in contracts/, OmniJS patterns in quickstart.md |
| III. Script Safety | ✅ PASS | All OmniJS patterns wrapped in try-catch with JSON returns |
| IV. Data Contracts | ✅ PASS | Discriminated unions, per-item batch results |
| V. Error Handling | ✅ PASS | Error codes for NOT_FOUND, DISAMBIGUATION_REQUIRED, etc. |
| VI. Build Discipline | ✅ PASS | Build passes (`pnpm build` verified) |
| VII. KISS | ✅ PASS | Reuses existing patterns from Phase 4 |
| VIII. YAGNI | ✅ PASS | Only spec'd requirements implemented |
| IX. SOLID | ✅ PASS | Single responsibility per contract file |
| X. TDD | ✅ READY | Contract tests defined, ready for Phase 2 |

### Phase 2: Tasks (Next - via /speckit.tasks)
- [ ] TDD task ordering per Constitution X
- [ ] Contract tests defined
- [ ] Unit tests defined
- [ ] Implementation tasks defined
- [ ] Integration tests defined
