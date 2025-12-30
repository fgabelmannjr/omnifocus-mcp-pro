# Data Model: Review System

**Feature**: Phase 5 - Review System
**Date**: 2025-12-30
**Source**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities, relationships, and validation rules
for the Review System tools. All entities map to OmniFocus Omni Automation
API objects.

---

## Entity Definitions

### ReviewInterval (Value Object)

Represents the cadence for project reviews. This is a **value object** with
special semantics in OmniJS.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `steps` | number | Integer, >= 1 | Count of time units |
| `unit` | string | Enum: 'days', 'weeks', 'months', 'years' | Time unit type |

**Value Object Semantics:**

```javascript
// ❌ WRONG - Modifying properties doesn't affect OmniFocus
project.reviewInterval.steps = 2;  // Local copy only

// ✅ CORRECT - Must reassign entire object
project.reviewInterval = { steps: 2, unit: 'weeks' };
```

**Null Handling:**
- `reviewInterval: null` indicates project has no review schedule
- Projects with `null` reviewInterval are excluded from review queries

**Zod Schema:** Reuse `ReviewIntervalSchema` from `project-tools/shared/project.ts`

---

### ReviewProjectSummary (Projection)

Optimized projection for review list responses. Contains only fields needed
for review workflow decisions.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Project's unique identifier (primaryKey) |
| `name` | string | No | Project's display name |
| `nextReviewDate` | string (ISO 8601) | Yes | When next review is due |
| `lastReviewDate` | string (ISO 8601) | Yes | When last reviewed (READ-ONLY) |
| `reviewInterval` | ReviewInterval | Yes | Configured review schedule |
| `status` | ProjectStatus | No | Current project status |

**Field Notes:**

- `nextReviewDate`: WRITABLE via scripts. This is the mechanism for "marking reviewed"
- `lastReviewDate`: READ-ONLY. OmniFocus updates this automatically when user marks
  reviewed in the app UI. Scripts cannot set this value.
- `status`: One of 'Active', 'OnHold', 'Done', 'Dropped'

**Sort Order:**
Results sorted by `nextReviewDate` ascending (most overdue first), then by `name`
alphabetically as secondary sort.

---

### ProjectIdentifier (Input)

Identifies a project for single or batch operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Conditional | Project's OmniFocus ID |
| `projectName` | string | Conditional | Project's display name |

**Validation Rules:**

1. At least one of `projectId` or `projectName` must be provided
2. If both provided, `projectId` takes precedence
3. Name lookups that match multiple projects return disambiguation error

---

### ReviewBatchItemResult (Output)

Per-item result for batch operations.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `projectId` | string | No | Resolved project ID (or input if lookup failed) |
| `projectName` | string | No | Project name (empty string if lookup failed) |
| `success` | boolean | No | Whether operation succeeded for this item |
| `error` | string | Yes | Error message (only when `success: false`) |
| `code` | string | Yes | Error code: 'DISAMBIGUATION_REQUIRED', 'NOT_FOUND', 'NO_INTERVAL' |
| `candidates` | Array<{id, name}> | Yes | Matching projects for disambiguation |
| `nextReviewDate` | string (ISO 8601) | Yes | New review date (only for mark_reviewed success) |
| `reviewInterval` | ReviewInterval | Yes | New interval (only for set_review_interval success) |

**Error Codes:**

| Code | Meaning |
|------|---------|
| `DISAMBIGUATION_REQUIRED` | Name matches multiple projects |
| `NOT_FOUND` | Project ID or name not found |
| `NO_INTERVAL` | Project has no review interval configured |

---

## State Transitions

### Project Review States

```text
┌─────────────┐    mark_reviewed()    ┌─────────────┐
│   Overdue   │ ─────────────────────>│   Upcoming  │
│ (past date) │                       │ (future)    │
└─────────────┘                       └─────────────┘
       ▲                                     │
       │                                     │
       │         time passes                 │
       └─────────────────────────────────────┘

┌─────────────────┐
│   No Schedule   │  ← reviewInterval: null
│ (excluded)      │
└─────────────────┘
       │
       │ set_review_interval(interval)
       ▼
┌─────────────────┐
│   Scheduled     │  ← Has reviewInterval
│ (in workflow)   │
└─────────────────┘
```

### Review Date Calculation

When `mark_reviewed` is called:

```text
today = Calendar.current.startOfDay(new Date())
nextReviewDate = today + reviewInterval

Example:
  today = 2025-12-30
  reviewInterval = { steps: 2, unit: 'weeks' }
  nextReviewDate = 2026-01-13
```

**Edge Cases (Calendar API handles automatically):**

| Today | Interval | Result | Notes |
|-------|----------|--------|-------|
| Jan 31 | 1 month | Feb 28 | Clamps to last day of month |
| Feb 29 | 1 year | Feb 28 (non-leap) | Clamps to Feb 28 |
| Dec 30 | 7 days | Jan 6 | Year boundary handled |

---

## Validation Rules

### get_projects_for_review Input

| Field | Validation | Error |
|-------|------------|-------|
| `limit` | 1-200, integer | "Invalid limit: {value}. Must be between 1 and 200" |
| `futureDays` | >= 1, integer | "Invalid futureDays: {value}. Must be >= 1" |
| `folderId` | Must exist if provided | "Folder not found: {folderId}" |
| `folderId` | Cannot be empty string | "Invalid folderId: cannot be empty string" |

### mark_reviewed Input

| Field | Validation | Error |
|-------|------------|-------|
| Input mode | Exactly one of (projectId, projectName, projects) | "Must provide projectId, projectName, or projects array" |
| `projectId` | Must exist | "Project not found: {identifier}" |
| `projectName` | Must be unique | "Multiple projects match '{name}'. Use ID for precision." |
| Project state | Must have reviewInterval | "Project '{name}' has no review interval configured" |

### set_review_interval Input

| Field | Validation | Error |
|-------|------------|-------|
| `interval.steps` | >= 1, integer | "Invalid interval steps: must be a positive integer" |
| `interval.unit` | Enum member | "Invalid interval unit: '{unit}'. Must be one of: days, weeks, months, years" |
| `interval` | null allowed | (No error - disables reviews) |

---

## Relationships

```text
┌──────────────────────┐
│       Project        │
├──────────────────────┤
│ id: string           │
│ name: string         │
│ status: ProjectStatus│
│ reviewInterval?      │──────┐
│ nextReviewDate?      │      │
│ lastReviewDate?      │      │
│ parentFolder?        │      │
└──────────────────────┘      │
         │                    │
         │ contains           │ 1:1
         ▼                    ▼
┌──────────────────────┐  ┌──────────────────────┐
│       Folder         │  │   ReviewInterval     │
├──────────────────────┤  ├──────────────────────┤
│ id: string           │  │ steps: number        │
│ name: string         │  │ unit: ReviewUnit     │
└──────────────────────┘  └──────────────────────┘
```

---

## API Response Formats

### get_projects_for_review Response

```typescript
// Success
{
  success: true,
  projects: ReviewProjectSummary[],
  totalCount: number  // Count BEFORE limit applied
}

// Error
{
  success: false,
  error: string
}
```

### mark_reviewed Response

```typescript
// Single project success
{
  success: true,
  project: {
    id: string,
    name: string,
    nextReviewDate: string,  // ISO 8601
    reviewInterval: ReviewInterval
  }
}

// Batch success
{
  success: true,
  results: ReviewBatchItemResult[]
}

// Error (single mode)
{
  success: false,
  error: string,
  candidates?: Array<{id: string, name: string}>  // For disambiguation
}
```

### set_review_interval Response

```typescript
// Single project success
{
  success: true,
  project: {
    id: string,
    name: string,
    reviewInterval: ReviewInterval | null,
    nextReviewDate: string | null  // ISO 8601
  }
}

// Batch success
{
  success: true,
  results: ReviewBatchItemResult[]
}

// Error (single mode)
{
  success: false,
  error: string,
  candidates?: Array<{id: string, name: string}>
}
```

---

## OmniJS Object Mapping

| TypeScript Type | OmniJS Property | Notes |
|-----------------|-----------------|-------|
| `ReviewProjectSummary.id` | `project.id.primaryKey` | UUID string |
| `ReviewProjectSummary.name` | `project.name` | String |
| `ReviewProjectSummary.nextReviewDate` | `project.nextReviewDate?.toISOString()` | Date or null |
| `ReviewProjectSummary.lastReviewDate` | `project.lastReviewDate?.toISOString()` | READ-ONLY |
| `ReviewProjectSummary.reviewInterval` | `project.reviewInterval` | Value object |
| `ReviewProjectSummary.status` | `project.status.name` | Enum name |
| `ProjectStatus` | `Project.Status.*` | Active, OnHold, Done, Dropped |
