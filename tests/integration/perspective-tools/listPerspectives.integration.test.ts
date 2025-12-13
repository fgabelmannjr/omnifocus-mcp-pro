import { describe, expect, it } from 'vitest';
import { listPerspectives } from '../../../src/tools/primitives/listPerspectives.js';
import { skipIfOmniFocusUnavailable } from '../helpers/index.js';

describe('listPerspectives integration', () => {
  skipIfOmniFocusUnavailable();

  it('should list all perspectives', async () => {
    const result = await listPerspectives({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives).toBeInstanceOf(Array);
      // OmniFocus always has some perspectives (at least built-in ones)
      expect(result.perspectives.length).toBeGreaterThan(0);
    }
  });

  it('should include built-in perspectives by default', async () => {
    const result = await listPerspectives({ includeBuiltIn: true });

    expect(result.success).toBe(true);
    if (result.success) {
      // Should find at least one built-in perspective
      const builtIn = result.perspectives.filter((p) => p.type === 'builtin');
      expect(builtIn.length).toBeGreaterThan(0);
    }
  });

  it('should exclude built-in perspectives when requested', async () => {
    const result = await listPerspectives({ includeBuiltIn: false });

    expect(result.success).toBe(true);
    if (result.success) {
      // No built-in perspectives should be included
      const builtIn = result.perspectives.filter((p) => p.type === 'builtin');
      expect(builtIn.length).toBe(0);
    }
  });

  it('should include custom perspectives when requested', async () => {
    const result = await listPerspectives({ includeCustom: true });

    expect(result.success).toBe(true);
    if (result.success) {
      // Custom perspectives may or may not exist, but array should be valid
      expect(result.perspectives).toBeInstanceOf(Array);
    }
  });

  it('should exclude custom perspectives when requested', async () => {
    const result = await listPerspectives({ includeCustom: false });

    expect(result.success).toBe(true);
    if (result.success) {
      // No custom perspectives should be included
      const custom = result.perspectives.filter((p) => p.type === 'custom');
      expect(custom.length).toBe(0);
    }
  });

  it('should return perspective properties', async () => {
    const result = await listPerspectives({});

    expect(result.success).toBe(true);
    if (result.success && result.perspectives.length > 0) {
      const perspective = result.perspectives[0];
      // Check expected properties exist
      expect(perspective.name).toBeTruthy();
      expect(['builtin', 'custom']).toContain(perspective.type);
    }
  });

  it('should return common built-in perspective names', async () => {
    const result = await listPerspectives({ includeBuiltIn: true });

    expect(result.success).toBe(true);
    if (result.success) {
      const names = result.perspectives.map((p) => p.name.toLowerCase());
      // OmniFocus has these standard perspectives
      const expectedPerspectives = ['inbox', 'projects', 'forecast'];
      const foundAny = expectedPerspectives.some((expected) =>
        names.some((name) => name.includes(expected))
      );
      expect(foundAny).toBe(true);
    }
  });

  it('should handle empty filter combination', async () => {
    // Request neither built-in nor custom - should return empty
    const result = await listPerspectives({
      includeBuiltIn: false,
      includeCustom: false
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives).toHaveLength(0);
    }
  });
});
