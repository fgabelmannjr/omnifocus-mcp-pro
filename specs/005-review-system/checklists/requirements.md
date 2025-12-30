# Phase 5: Review System - Requirements Checklist

## Overview

- **Phase**: 5 of 20
- **Tools**: 3 (`get_projects_for_review`, `mark_reviewed`, `set_review_interval`)
- **Branch**: `005-review-system`

---

## Tool 1: get_projects_for_review

### Functional Requirements

- [ ] **FR-001**: Tool MUST return projects where `nextReviewDate <= today` by default
- [ ] **FR-002**: Tool MUST support `includeFuture` parameter to include upcoming reviews
- [ ] **FR-003**: Tool MUST support `futureDays` parameter (default: 7) when `includeFuture` is true
- [ ] **FR-004**: Tool MUST support `folderId` filter to scope results to a folder hierarchy
- [ ] **FR-005**: Tool MUST support `includeAll` parameter to return all reviewable projects
- [ ] **FR-006**: Tool MUST support `includeInactive` parameter to include dropped/completed projects
- [ ] **FR-007**: Tool MUST exclude projects with `reviewInterval: null` (no review schedule)
- [ ] **FR-008**: Tool MUST sort results by `nextReviewDate` ascending (most overdue first)
- [ ] **FR-009**: Tool MUST return: `id`, `name`, `nextReviewDate`, `lastReviewDate`, `reviewInterval`, `status`
- [ ] **FR-010**: Tool MUST support `limit` parameter for pagination (default: 50, max: 200)
- [ ] **FR-011**: Tool MUST return `totalCount` indicating total matching projects

### Contracts

- [ ] Input schema (Zod)
- [ ] Output schema (Zod)
- [ ] Contract tests passing

### Implementation

- [ ] Primitive function
- [ ] Definition/handler
- [ ] Unit tests passing
- [ ] Registered in server.ts

---

## Tool 2: mark_reviewed

### Functional Requirements

- [ ] **FR-012**: Tool MUST accept single project ID or array of project IDs
- [ ] **FR-013**: Tool MUST calculate `nextReviewDate` as `today + reviewInterval`
- [ ] **FR-014**: Tool MUST return error if project has no `reviewInterval` configured
- [ ] **FR-015**: Tool MUST support both ID and name-based project lookup
- [ ] **FR-016**: Tool MUST return disambiguation error when name matches multiple projects
- [ ] **FR-017**: Tool MUST return updated project data including new `nextReviewDate`
- [ ] **FR-018**: Tool MUST process batch operations with per-item results
- [ ] **FR-019**: Tool MUST NOT fail entire batch if some items fail
- [ ] **FR-020**: Tool MUST preserve original array indices in batch results

### Contracts

- [ ] Input schema (Zod)
- [ ] Output schema (Zod)
- [ ] Contract tests passing

### Implementation

- [ ] Primitive function
- [ ] Definition/handler
- [ ] Unit tests passing
- [ ] Registered in server.ts

---

## Tool 3: set_review_interval

### Functional Requirements

- [ ] **FR-021**: Tool MUST accept `interval` as `{steps: number, unit: string}` or `null`
- [ ] **FR-022**: Tool MUST validate `unit` is one of: 'days', 'weeks', 'months', 'years'
- [ ] **FR-023**: Tool MUST validate `steps` is a positive integer (>= 1)
- [ ] **FR-024**: Tool MUST support `null` interval to disable reviews for a project
- [ ] **FR-025**: Tool MUST support `recalculateNextReview` parameter (default: false)
- [ ] **FR-026**: When `recalculateNextReview: true`, MUST set `nextReviewDate` to today + interval
- [ ] **FR-027**: When setting interval on project without one, MUST set initial `nextReviewDate` to today + interval
- [ ] **FR-028**: Tool MUST return updated project data including new `reviewInterval`
- [ ] **FR-029**: Tool MUST support both ID and name-based project lookup
- [ ] **FR-030**: Tool MUST return disambiguation error when name matches multiple projects

### Contracts

- [ ] Input schema (Zod)
- [ ] Output schema (Zod)
- [ ] Contract tests passing

### Implementation

- [ ] Primitive function
- [ ] Definition/handler
- [ ] Unit tests passing
- [ ] Registered in server.ts

---

## Error Handling (All Tools)

- [ ] **FR-031**: All tools MUST return structured error responses with `success: false`
- [ ] **FR-032**: Error responses MUST include actionable `error` message
- [ ] **FR-033**: Disambiguation errors MUST include `candidates` array with matching projects

---

## Success Criteria

- [ ] **SC-001**: `get_projects_for_review` returns correct projects in < 500ms for databases with 500+ projects
- [ ] **SC-002**: `mark_reviewed` correctly calculates `nextReviewDate` for all interval units (days, weeks, months, years)
- [ ] **SC-003**: Batch `mark_reviewed` processes 50 projects with 100% accuracy on per-item results
- [ ] **SC-004**: All three tools pass contract validation with Zod schemas
- [ ] **SC-005**: All tools handle disambiguation correctly (name matches multiple → error with candidates)
- [ ] **SC-006**: `set_review_interval` with `null` correctly removes project from review workflow
- [ ] **SC-007**: Integration tests verify round-trip: create interval → mark reviewed → verify date calculation

---

## Definition of Done

- [ ] All functional requirements (FR-001 through FR-033) implemented
- [ ] Contract tests validate input/output schemas
- [ ] Unit tests cover all acceptance scenarios
- [ ] Integration tests verify OmniFocus interaction
- [ ] Tools registered in MCP server
- [ ] README updated with new tools
- [ ] CLAUDE.md updated with phase status

---

## API Constraints (Critical)

### NO `markReviewed()` method exists

The plan document mentions `project.markReviewed()` but this method does NOT exist
in the Omni Automation API. Implementation must:

1. Calculate new date: `today + reviewInterval`
2. Set `nextReviewDate` directly: `project.nextReviewDate = newDate`

### `lastReviewDate` is READ-ONLY

Cannot set `lastReviewDate` via scripts. OmniFocus updates this automatically
when user marks reviewed in the app. Scripts can only read this value.

### ReviewInterval Value Object Semantics

Cannot modify `reviewInterval.steps` directly. Must reassign entire object:

```javascript
// WRONG - won't work
project.reviewInterval.steps = 2;

// CORRECT
project.reviewInterval = { steps: 2, unit: 'weeks' };
```

### Date Calculation: USE Calendar/DateComponents API

**CRITICAL**: Do NOT use millisecond arithmetic for date calculations.
Use the Calendar API for correct handling of months/years:

```javascript
// CORRECT: Calendar API handles month/year boundaries
var today = Calendar.current.startOfDay(new Date());
var dc = new DateComponents();
dc.month = 2;  // For "2 months" interval
project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);

// WRONG: Millisecond math fails for months/years
var ms = steps * 30 * 24 * 60 * 60 * 1000;  // BAD - months aren't 30 days
project.nextReviewDate = new Date(Date.now() + ms);
```

**DateComponents Unit Mapping:**

| reviewInterval.unit | DateComponents property |
|---------------------|------------------------|
| `'days'`            | `dc.day`               |
| `'weeks'`           | `dc.week`              |
| `'months'`          | `dc.month`             |
| `'years'`           | `dc.year`              |

### OmniFocus Version Requirements

| Feature | Minimum Version |
|---------|-----------------|
| `Project.reviewInterval` | OmniFocus 3.11 |
| `Calendar.current` / `DateComponents` | OmniFocus 3.0+ |
| `flattenedProjects.filter()` | OmniFocus 3.0+ |

- Ensure compatibility notes in documentation

### Date Normalization

Always use `Calendar.current.startOfDay()` when calculating from "today" to
ensure consistent time components (midnight) for date comparisons.
