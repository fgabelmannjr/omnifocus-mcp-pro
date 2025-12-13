import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import {
  generateGetPerspectiveViewScript,
  getPerspectiveView
} from '../../src/tools/primitives/getPerspectiveView.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('getPerspectiveView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateGetPerspectiveViewScript', () => {
    it('should generate valid OmniJS script', () => {
      const script = generateGetPerspectiveViewScript();

      expect(script).toContain('document.windows[0]');
      expect(script).toContain('Perspective.BuiltIn.Inbox');
      expect(script).toContain('Perspective.BuiltIn.Projects');
      expect(script).toContain('Perspective.BuiltIn.Flagged');
      expect(script).toContain('JSON.stringify');
    });

    it('should be an IIFE', () => {
      const script = generateGetPerspectiveViewScript();

      expect(script.startsWith('(function()')).toBe(true);
      expect(script.endsWith('})();')).toBe(true);
    });

    it('should include task status mapping', () => {
      const script = generateGetPerspectiveViewScript();

      expect(script).toContain('Task.Status.Available');
      expect(script).toContain('Task.Status.Blocked');
      expect(script).toContain('Task.Status.Completed');
    });
  });

  describe('input validation', () => {
    it('should return error for empty perspective name', async () => {
      const result = await getPerspectiveView({ perspectiveName: '' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Perspective name is required');
      expect(mockExecuteOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for whitespace-only perspective name', async () => {
      const result = await getPerspectiveView({ perspectiveName: '   ' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Perspective name is required');
    });

    it('should return error for null params', async () => {
      const result = await getPerspectiveView(
        null as unknown as Parameters<typeof getPerspectiveView>[0]
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Perspective name is required');
    });
  });

  describe('successful perspective view', () => {
    it('should return Inbox perspective view', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: [
          { id: 'task-1', name: 'Inbox Task 1', flagged: false, completed: false },
          { id: 'task-2', name: 'Inbox Task 2', flagged: true, completed: false }
        ]
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(2);
      }
    });

    it('should return Flagged perspective view', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Flagged',
        items: [{ id: 'task-1', name: 'Flagged Task', flagged: true, completed: false }]
      });

      const result = await getPerspectiveView({ perspectiveName: 'Flagged' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items?.every((item) => item.flagged)).toBe(true);
      }
    });

    it('should return Projects perspective view', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Projects',
        items: [
          { id: 'project-1', name: 'Project 1', type: 'project' },
          { id: 'project-2', name: 'Project 2', type: 'project' }
        ]
      });

      const result = await getPerspectiveView({ perspectiveName: 'Projects' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toHaveLength(2);
      }
    });

    it('should return custom perspective view', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Work Focus',
        items: [{ id: 'task-1', name: 'Work Task', tagNames: ['Work'] }]
      });

      const result = await getPerspectiveView({ perspectiveName: 'Work Focus' });

      expect(result.success).toBe(true);
    });
  });

  describe('perspective mismatch warning', () => {
    it('should warn when current perspective differs from requested', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: []
      });

      await getPerspectiveView({ perspectiveName: 'Flagged' });

      expect(console.warn).toHaveBeenCalled();
    });

    it('should not warn when perspective matches (case-insensitive)', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: []
      });

      await getPerspectiveView({ perspectiveName: 'inbox' });

      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('limit parameter', () => {
    it('should apply limit to results', async () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`
      }));

      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: manyItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox', limit: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items?.length).toBe(10);
      }
    });

    it('should use default limit of 100', async () => {
      const manyItems = Array.from({ length: 150 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`
      }));

      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: manyItems
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items?.length).toBe(100);
      }
    });
  });

  describe('fields filtering', () => {
    it('should filter to requested fields only', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: [
          {
            id: 'task-1',
            name: 'Task 1',
            note: 'Some note',
            flagged: true,
            dueDate: '2024-12-31',
            tagNames: ['Work']
          }
        ]
      });

      const result = await getPerspectiveView({
        perspectiveName: 'Inbox',
        fields: ['id', 'name']
      });

      expect(result.success).toBe(true);
      if (result.success && result.items?.[0]) {
        const item = result.items[0];
        expect(Object.keys(item)).toEqual(['id', 'name']);
      }
    });

    it('should return all fields when no fields specified', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: [
          {
            id: 'task-1',
            name: 'Task 1',
            flagged: true,
            dueDate: '2024-12-31'
          }
        ]
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      if (result.success && result.items?.[0]) {
        expect(result.items[0]).toHaveProperty('id');
        expect(result.items[0]).toHaveProperty('name');
        expect(result.items[0]).toHaveProperty('flagged');
        expect(result.items[0]).toHaveProperty('dueDate');
      }
    });
  });

  describe('item properties', () => {
    it('should include task properties', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: [
          {
            id: 'task-1',
            name: 'Task 1',
            note: 'Some note',
            flagged: true,
            completed: false,
            dueDate: '2024-12-31T00:00:00Z',
            deferDate: '2024-12-01T00:00:00Z',
            completionDate: null,
            taskStatus: 'Available',
            projectName: 'My Project',
            tagNames: ['Work', 'Important'],
            estimatedMinutes: 30
          }
        ]
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      if (result.success && result.items?.[0]) {
        const item = result.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('note');
        expect(item).toHaveProperty('flagged');
        expect(item).toHaveProperty('completed');
        expect(item).toHaveProperty('taskStatus');
        expect(item).toHaveProperty('tagNames');
      }
    });
  });

  describe('error handling', () => {
    it('should return error when no OmniFocus window is open', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'No OmniFocus window is open'
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No OmniFocus window');
    });

    it('should handle execution rejection', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus not running'));

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus not running');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });

    it('should handle empty items array', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox',
        items: []
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toEqual([]);
      }
    });

    it('should handle undefined items in response', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        perspectiveName: 'Inbox'
        // items undefined
      });

      const result = await getPerspectiveView({ perspectiveName: 'Inbox' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.items).toEqual([]);
      }
    });
  });
});
