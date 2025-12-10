---
paths:
  - "tests/**"
  - "**/*.test.ts"
---

# Testing Conventions

## Framework

- Vitest for all tests
- V8 coverage via `pnpm test:coverage`

## Patterns

- Mock `executeJXA()` to avoid OmniFocus dependency
- Test JXA string generation separately from execution
- Validate cycle detection in batch operations
- Test date parsing edge cases

## File Organization

- Place tests in `tests/` or colocate as `*.test.ts`
- Never disable tests - fix them instead

## Running Tests

```bash
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With V8 coverage
```

## Mocking JXA

```typescript
import { vi } from "vitest";
import { executeJXA } from "../src/utils/scriptExecution.js";

vi.mock("../src/utils/scriptExecution.js", () => ({
  executeJXA: vi.fn(),
}));
```

## Test Structure

```typescript
describe("toolName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle valid input", async () => {
    // Arrange, Act, Assert
  });

  it("should handle errors gracefully", async () => {
    // Test error cases
  });
});
```
