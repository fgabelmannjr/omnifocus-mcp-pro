import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import {
  generateListPerspectivesScript,
  listPerspectives
} from '../../src/tools/primitives/listPerspectives.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('listPerspectives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateListPerspectivesScript', () => {
    it('should generate valid OmniJS script', () => {
      const script = generateListPerspectivesScript();

      expect(script).toContain('Perspective.BuiltIn.Inbox');
      expect(script).toContain('Perspective.BuiltIn.Projects');
      expect(script).toContain('Perspective.BuiltIn.Tags');
      expect(script).toContain('Perspective.BuiltIn.Forecast');
      expect(script).toContain('Perspective.BuiltIn.Flagged');
      expect(script).toContain('Perspective.BuiltIn.Review');
      expect(script).toContain('Perspective.Custom.all');
      expect(script).toContain('JSON.stringify');
    });

    it('should be an IIFE', () => {
      const script = generateListPerspectivesScript();

      expect(script.startsWith('(function()')).toBe(true);
      expect(script.endsWith('})();')).toBe(true);
    });
  });

  describe('successful listing', () => {
    it('should list all perspectives by default', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [
          {
            id: 'builtin_inbox',
            name: 'Inbox',
            type: 'builtin',
            isBuiltIn: true,
            canModify: false
          },
          {
            id: 'builtin_projects',
            name: 'Projects',
            type: 'builtin',
            isBuiltIn: true,
            canModify: false
          },
          { id: 'custom_1', name: 'My Custom', type: 'custom', isBuiltIn: false, canModify: true }
        ]
      });

      const result = await listPerspectives({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.perspectives).toHaveLength(3);
      }
    });

    it('should list only built-in perspectives when includeCustom is false', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [
          {
            id: 'builtin_inbox',
            name: 'Inbox',
            type: 'builtin',
            isBuiltIn: true,
            canModify: false
          },
          {
            id: 'builtin_projects',
            name: 'Projects',
            type: 'builtin',
            isBuiltIn: true,
            canModify: false
          },
          { id: 'custom_1', name: 'My Custom', type: 'custom', isBuiltIn: false, canModify: true }
        ]
      });

      const result = await listPerspectives({ includeCustom: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.perspectives).toHaveLength(2);
        expect(result.perspectives?.every((p) => p.type === 'builtin')).toBe(true);
      }
    });

    it('should list only custom perspectives when includeBuiltIn is false', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [
          {
            id: 'builtin_inbox',
            name: 'Inbox',
            type: 'builtin',
            isBuiltIn: true,
            canModify: false
          },
          { id: 'custom_1', name: 'My Custom', type: 'custom', isBuiltIn: false, canModify: true },
          {
            id: 'custom_2',
            name: 'Another Custom',
            type: 'custom',
            isBuiltIn: false,
            canModify: true
          }
        ]
      });

      const result = await listPerspectives({ includeBuiltIn: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.perspectives).toHaveLength(2);
        expect(result.perspectives?.every((p) => p.type === 'custom')).toBe(true);
      }
    });

    it('should return empty array when no perspectives match filters', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [
          { id: 'builtin_inbox', name: 'Inbox', type: 'builtin', isBuiltIn: true, canModify: false }
        ]
      });

      const result = await listPerspectives({ includeBuiltIn: false, includeCustom: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.perspectives).toHaveLength(0);
      }
    });

    it('should handle empty perspectives list from OmniFocus', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: []
      });

      const result = await listPerspectives({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.perspectives).toEqual([]);
      }
    });

    it('should use default parameters when none provided', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [{ id: 'builtin_inbox', name: 'Inbox', type: 'builtin' }]
      });

      const result = await listPerspectives();

      expect(result.success).toBe(true);
      expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
    });
  });

  describe('perspective properties', () => {
    it('should include all expected properties for built-in perspectives', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [
          { id: 'builtin_inbox', name: 'Inbox', type: 'builtin', isBuiltIn: true, canModify: false }
        ]
      });

      const result = await listPerspectives({});

      expect(result.success).toBe(true);
      if (result.success && result.perspectives?.[0]) {
        const perspective = result.perspectives[0];
        expect(perspective).toHaveProperty('id');
        expect(perspective).toHaveProperty('name');
        expect(perspective).toHaveProperty('type');
        expect(perspective.type).toBe('builtin');
      }
    });

    it('should include all expected properties for custom perspectives', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectives: [
          {
            id: 'custom_work',
            name: 'Work Focus',
            type: 'custom',
            isBuiltIn: false,
            canModify: true
          }
        ]
      });

      const result = await listPerspectives({ includeBuiltIn: false });

      expect(result.success).toBe(true);
      if (result.success && result.perspectives?.[0]) {
        const perspective = result.perspectives[0];
        expect(perspective.type).toBe('custom');
      }
    });
  });

  describe('error handling', () => {
    it('should return error when script execution fails', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        error: 'No OmniFocus window available'
      });

      const result = await listPerspectives({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No OmniFocus window available');
    });

    it('should handle execution rejection', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus not running'));

      const result = await listPerspectives({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus not running');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await listPerspectives({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should handle undefined perspectives in response', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true
        // perspectives undefined
      });

      const result = await listPerspectives({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.perspectives).toEqual([]);
      }
    });
  });
});
