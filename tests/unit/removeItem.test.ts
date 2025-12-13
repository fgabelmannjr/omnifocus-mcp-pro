import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import { removeItem } from '../../src/tools/primitives/removeItem.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('removeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('task removal', () => {
    it('should remove task by ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Deleted Task'
      });

      const result = await removeItem({
        id: 'task-123',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task-123');
        expect(result.name).toBe('Deleted Task');
      }
      expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should remove task by name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-456',
        name: 'Task to Delete'
      });

      const result = await removeItem({
        name: 'Task to Delete',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Task to Delete');
      }
    });

    it('should prefer ID over name when both provided', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-789',
        name: 'Found by ID'
      });

      const result = await removeItem({
        id: 'task-789',
        name: 'Different Name',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project removal', () => {
    it('should remove project by ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Deleted Project'
      });

      const result = await removeItem({
        id: 'project-123',
        itemType: 'project'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('project-123');
        expect(result.name).toBe('Deleted Project');
      }
    });

    it('should remove project by name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-456',
        name: 'Project to Delete'
      });

      const result = await removeItem({
        name: 'Project to Delete',
        itemType: 'project'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should return error when neither id nor name provided', async () => {
      const result = await removeItem({
        itemType: 'task'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Either id or name must be provided');
      }
      expect(mockExecuteOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for invalid itemType', async () => {
      const result = await removeItem({
        id: 'item-123',
        itemType: 'invalid' as 'task'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('itemType must be either');
      }
    });

    it('should return error for null params', async () => {
      const result = await removeItem(null as unknown as Parameters<typeof removeItem>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Parameters object is required');
      }
    });

    it('should return error for missing itemType', async () => {
      const result = await removeItem({
        id: 'item-123'
      } as Parameters<typeof removeItem>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('itemType');
      }
    });
  });

  describe('error handling', () => {
    it('should return error when item not found', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await removeItem({
        id: 'nonexistent',
        itemType: 'task'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await removeItem({
        id: 'task-123',
        itemType: 'task'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('OmniFocus script execution failed');
      }
    });

    it('should handle script error response', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Script error occurred'
      });

      const result = await removeItem({
        id: 'task-123',
        itemType: 'task'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await removeItem({
        id: 'task-123',
        itemType: 'task'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('special characters in names', () => {
    it('should handle quotes in name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-quotes',
        name: "John's Task"
      });

      const result = await removeItem({
        name: "John's Task",
        itemType: 'task'
      });

      expect(result.success).toBe(true);
    });

    it('should handle double quotes in name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-dquotes',
        name: 'Task "Alpha"'
      });

      const result = await removeItem({
        name: 'Task "Alpha"',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
    });

    it('should handle backslashes in name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-backslash',
        name: 'C:\\Projects\\Task'
      });

      const result = await removeItem({
        name: 'C:\\Projects\\Task',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters in name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-unicode',
        name: '删除任务'
      });

      const result = await removeItem({
        name: '删除任务',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('response properties', () => {
    it('should return item with all expected fields', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-full',
        name: 'Complete Task'
      });

      const result = await removeItem({
        id: 'task-full',
        itemType: 'task'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
      }
    });
  });
});
