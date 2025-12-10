---
paths:
  - "src/utils/omnifocusScripts/**/*.js"
  - "src/tools/primitives/**/*.ts"
---

# JXA Development Rules

## Critical Behaviors

- JXA errors fail silently - test in Script Editor first
- Always wrap in try-catch with JSON error returns
- Use `.tasks.whose()` syntax (not SQL)
- Date comparisons use `.getTime()` for milliseconds

## Script Structure

All JXA scripts must follow this pattern:

```javascript
try {
    // ... JXA logic ...
    JSON.stringify({ success: true, data: result });
} catch (e) {
    JSON.stringify({ success: false, error: e.message || String(e) });
}
```

## String Building

- Template literals inside JXA need careful escaping
- Backticks inside generated JXA require extra escaping
- OmniFocus interprets dates as local time, not UTC

## OmniFocus Object Model

- Use `.tasks.whose()` for filtering tasks
- Use `.projects.whose()` for filtering projects
- Use `.flattenedTasks` for all tasks regardless of hierarchy
- Date properties return JavaScript Date objects

## Date Handling Chain

1. **Input**: ISO 8601 strings from MCP tools
2. **JXA**: Convert to `new Date("2024-12-25T00:00:00Z")`
3. **OmniFocus**: Stores as native Date objects
4. **Comparison**: Use `.getTime()` for milliseconds
5. **Output**: Convert back to ISO 8601 for response
