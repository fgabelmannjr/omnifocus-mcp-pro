import { describe, expect, it } from 'vitest';
import { getPerspectiveView } from '../../../src/tools/primitives/getPerspectiveView.js';
import { skipIfOmniFocusUnavailable } from '../helpers/index.js';

describe('getPerspectiveView integration', () => {
  skipIfOmniFocusUnavailable();

  it('should get inbox perspective view', async () => {
    const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toBeInstanceOf(Array);
    }
  });

  it('should get projects perspective view', async () => {
    const result = await getPerspectiveView({ perspectiveName: 'Projects' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toBeInstanceOf(Array);
    }
  });

  it('should respect limit parameter', async () => {
    const result = await getPerspectiveView({
      perspectiveName: 'Inbox',
      limit: 5
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items.length).toBeLessThanOrEqual(5);
    }
  });

  it('should filter fields when specified', async () => {
    const result = await getPerspectiveView({
      perspectiveName: 'Inbox',
      fields: ['id', 'name']
    });

    expect(result.success).toBe(true);
    if (result.success && result.items.length > 0) {
      const item = result.items[0];
      // Should only have the specified fields
      const keys = Object.keys(item);
      // All keys should be in our requested fields
      keys.forEach((key) => {
        expect(['id', 'name']).toContain(key);
      });
    }
  });

  it('should return error for empty perspective name', async () => {
    const result = await getPerspectiveView({ perspectiveName: '' });

    expect(result.success).toBe(false);
    if (!result.success && result.error) {
      expect(result.error).toContain('required');
    }
  });

  it('should handle non-existent perspective gracefully', async () => {
    // Note: The implementation may warn but still return current perspective
    const result = await getPerspectiveView({
      perspectiveName: 'NonExistentPerspective12345'
    });

    // The function should not crash - it may succeed with current perspective or fail gracefully
    expect(typeof result.success).toBe('boolean');
  });

  it('should return item properties', async () => {
    const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

    expect(result.success).toBe(true);
    if (result.success && result.items.length > 0) {
      const item = result.items[0];
      // Items should have at least some identifying properties
      expect(item.id || item.name).toBeTruthy();
    }
  });

  it('should handle large limit value', async () => {
    const result = await getPerspectiveView({
      perspectiveName: 'Inbox',
      limit: 1000
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Should not crash and should return array (possibly empty)
      expect(result.items).toBeInstanceOf(Array);
    }
  });

  it('should handle zero limit', async () => {
    // Zero limit should return empty or be treated as default
    const result = await getPerspectiveView({
      perspectiveName: 'Inbox',
      limit: 0
    });

    // Should not crash
    expect(typeof result.success).toBe('boolean');
  });
});
