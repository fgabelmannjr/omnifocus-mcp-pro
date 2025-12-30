# OmniJS Quickstart: Review System

**Phase**: 005-review-system | **Date**: 2025-12-30

This document provides ready-to-use OmniJS patterns for implementing the Review
System tools. All patterns have been validated in OmniFocus Script Editor.

## Critical Constraints

### No `markReviewed()` Method

OmniFocus has **NO** built-in `markReviewed()` method. To mark a project as
reviewed:

1. Calculate new date: `today + reviewInterval`
2. Set `project.nextReviewDate` directly
3. OmniFocus automatically updates `lastReviewDate` to the current date

### Date Properties

| Property | Readable | Writable | Notes |
|----------|----------|----------|-------|
| `lastReviewDate` | ✅ | ❌ | Managed by OmniFocus automatically |
| `nextReviewDate` | ✅ | ✅ | This is how you "mark reviewed" |
| `reviewInterval` | ✅ | ✅ | Value object semantics (see below) |

### ReviewInterval Value Object

```javascript
// WRONG - modifies local copy only, has NO effect
project.reviewInterval.steps = 14;  // ❌

// CORRECT - full reassignment triggers OmniFocus update
project.reviewInterval = { steps: 14, unit: 'days' };  // ✓
```

**Why?** `project.reviewInterval` returns a COPY. Modifying the copy doesn't
affect the project. Full reassignment is required.

## Date Calculation with Calendar API

**CRITICAL**: Never use millisecond math for date calculations. Use the
Calendar/DateComponents API instead.

```javascript
// ❌ WRONG - fails for months/years (varying lengths)
var ms = project.reviewInterval.steps * 30 * 24 * 60 * 60 * 1000;
project.nextReviewDate = new Date(Date.now() + ms);

// ✓ CORRECT - handles all edge cases properly
var today = Calendar.current.startOfDay(new Date());
var dc = new DateComponents();

switch (project.reviewInterval.unit) {
  case 'days':   dc.day = project.reviewInterval.steps;   break;
  case 'weeks':  dc.week = project.reviewInterval.steps;  break;
  case 'months': dc.month = project.reviewInterval.steps; break;
  case 'years':  dc.year = project.reviewInterval.steps;  break;
}

project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
```

## Tool Implementation Patterns

### get_projects_for_review

```javascript
(function() {
  try {
    var today = Calendar.current.startOfDay(new Date());
    var includeUpcoming = ${includeUpcoming};
    var limit = ${limit};

    // Calculate 7-day horizon for upcoming filter
    var upcomingDC = new DateComponents();
    upcomingDC.day = 7;
    var upcomingHorizon = Calendar.current.dateByAddingDateComponents(today, upcomingDC);

    var results = [];
    var dueCount = 0;
    var upcomingCount = 0;

    flattenedProjects.forEach(function(project) {
      // Skip projects without review configured
      if (!project.reviewInterval) return;
      if (!project.nextReviewDate) return;

      // Skip completed/dropped projects
      if (project.status.name === 'Done' || project.status.name === 'Dropped') return;

      var nextReview = project.nextReviewDate;
      var isDue = nextReview <= today;
      var isUpcoming = !isDue && nextReview <= upcomingHorizon;

      if (isDue) {
        dueCount++;
      } else if (isUpcoming) {
        upcomingCount++;
      }

      // Include if due, or if upcoming and includeUpcoming is true
      if (isDue || (includeUpcoming && isUpcoming)) {
        results.push({
          id: project.id.primaryKey,
          name: project.name,
          status: project.status.name,
          flagged: project.flagged,
          reviewInterval: {
            steps: project.reviewInterval.steps,
            unit: project.reviewInterval.unit
          },
          lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
          nextReviewDate: project.nextReviewDate.toISOString(),
          remainingCount: project.flattenedTasks.filter(function(t) { return !t.completed; }).length
        });
      }
    });

    // Sort by nextReviewDate ascending (most overdue first)
    results.sort(function(a, b) {
      return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
    });

    // Apply limit
    if (results.length > limit) {
      results = results.slice(0, limit);
    }

    return JSON.stringify({
      success: true,
      projects: results,
      count: results.length,
      dueCount: dueCount,
      upcomingCount: upcomingCount
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### mark_reviewed

```javascript
(function() {
  try {
    var projectIdentifiers = ${JSON.stringify(projectIdentifiers)};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var today = Calendar.current.startOfDay(new Date());

    projectIdentifiers.forEach(function(identifier, index) {
      var project = null;
      var result = {
        projectId: identifier.id || '',
        projectName: identifier.name || '',
        success: false
      };

      // Find project by ID or name
      if (identifier.id) {
        project = Project.byIdentifier(identifier.id);
      } else if (identifier.name) {
        var matches = flattenedProjects.filter(function(p) {
          return p.name === identifier.name;
        });
        if (matches.length === 1) {
          project = matches[0];
        } else if (matches.length > 1) {
          result.error = 'Multiple projects found with name "' + identifier.name + '"';
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = matches.map(function(p) { return p.id.primaryKey; });
          results.push(result);
          failed++;
          return;
        }
      }

      if (!project) {
        result.error = 'Project not found';
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      // Check for reviewInterval
      if (!project.reviewInterval) {
        result.projectId = project.id.primaryKey;
        result.projectName = project.name;
        result.error = 'Project has no review interval configured';
        result.code = 'NO_REVIEW_INTERVAL';
        results.push(result);
        failed++;
        return;
      }

      // Store previous date for response
      var previousNextReviewDate = project.nextReviewDate ?
        project.nextReviewDate.toISOString() : null;

      // Calculate new nextReviewDate using Calendar API
      var dc = new DateComponents();
      switch (project.reviewInterval.unit) {
        case 'days':   dc.day = project.reviewInterval.steps;   break;
        case 'weeks':  dc.week = project.reviewInterval.steps;  break;
        case 'months': dc.month = project.reviewInterval.steps; break;
        case 'years':  dc.year = project.reviewInterval.steps;  break;
      }

      var newNextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
      project.nextReviewDate = newNextReviewDate;

      result.projectId = project.id.primaryKey;
      result.projectName = project.name;
      result.success = true;
      result.previousNextReviewDate = previousNextReviewDate;
      result.newNextReviewDate = newNextReviewDate.toISOString();

      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: {
        total: projectIdentifiers.length,
        succeeded: succeeded,
        failed: failed
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_review_interval

```javascript
(function() {
  try {
    var projectIdentifiers = ${JSON.stringify(projectIdentifiers)};
    var interval = ${interval === null ? 'null' : JSON.stringify(interval)};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var today = Calendar.current.startOfDay(new Date());

    projectIdentifiers.forEach(function(identifier, index) {
      var project = null;
      var result = {
        projectId: identifier.id || '',
        projectName: identifier.name || '',
        success: false
      };

      // Find project by ID or name
      if (identifier.id) {
        project = Project.byIdentifier(identifier.id);
      } else if (identifier.name) {
        var matches = flattenedProjects.filter(function(p) {
          return p.name === identifier.name;
        });
        if (matches.length === 1) {
          project = matches[0];
        } else if (matches.length > 1) {
          result.error = 'Multiple projects found with name "' + identifier.name + '"';
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = matches.map(function(p) { return p.id.primaryKey; });
          results.push(result);
          failed++;
          return;
        }
      }

      if (!project) {
        result.error = 'Project not found';
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      // Store previous interval for response
      var previousInterval = project.reviewInterval ? {
        steps: project.reviewInterval.steps,
        unit: project.reviewInterval.unit
      } : null;

      result.projectId = project.id.primaryKey;
      result.projectName = project.name;
      result.previousInterval = previousInterval;

      if (interval === null) {
        // Disable reviews - clear interval and nextReviewDate
        project.reviewInterval = null;
        project.nextReviewDate = null;
        result.newInterval = null;
      } else {
        // Set new interval (value object - must reassign entirely)
        project.reviewInterval = { steps: interval.steps, unit: interval.unit };

        // If nextReviewDate is null, calculate initial value
        if (!project.nextReviewDate) {
          var dc = new DateComponents();
          switch (interval.unit) {
            case 'days':   dc.day = interval.steps;   break;
            case 'weeks':  dc.week = interval.steps;  break;
            case 'months': dc.month = interval.steps; break;
            case 'years':  dc.year = interval.steps;  break;
          }
          project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
        }

        result.newInterval = { steps: interval.steps, unit: interval.unit };
      }

      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: {
        total: projectIdentifiers.length,
        succeeded: succeeded,
        failed: failed
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

## Folder Filtering Pattern

When filtering by folder, include all nested subfolders recursively:

```javascript
function isProjectInFolder(project, targetFolder) {
  var folder = project.parentFolder;
  while (folder) {
    if (folder.id.primaryKey === targetFolder.id.primaryKey) {
      return true;
    }
    folder = folder.parent;
  }
  return false;
}

// Find folder by ID or name
var targetFolder = null;
if (folderId) {
  targetFolder = Folder.byIdentifier(folderId);
} else if (folderName) {
  targetFolder = flattenedFolders.byName(folderName);
}

// Filter projects
var filtered = flattenedProjects.filter(function(p) {
  return isProjectInFolder(p, targetFolder);
});
```

## Error Response Format

All OmniJS scripts follow this error handling pattern:

```javascript
(function() {
  try {
    // ... implementation ...
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

## Testing in Script Editor

Before integrating, test all OmniJS patterns in OmniFocus Script Editor:

1. Open OmniFocus
2. Press `⌘-⌃-O` to open Automation Console
3. Paste script and execute
4. Verify JSON output structure

## Related Documentation

- [spec.md](./spec.md) - Feature specification
- [research.md](./research.md) - API research findings
- [data-model.md](./data-model.md) - Entity definitions
- [plan.md](./plan.md) - Implementation plan
