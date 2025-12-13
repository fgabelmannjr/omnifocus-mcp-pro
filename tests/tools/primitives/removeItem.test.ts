import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('removeItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful removal', () => {
    it('should remove a task by ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Removed Task'
      });

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(true);
      expect(result.id).toBe('task-123');
      expect(result.name).toBe('Removed Task');
      expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should remove a task by name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-456',
        name: 'My Task'
      });

      const result = await removeItem({ itemType: 'task', name: 'My Task' });

      expect(result.success).toBe(true);
      expect(result.name).toBe('My Task');
    });

    it('should remove a project by ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Removed Project'
      });

      const result = await removeItem({ itemType: 'project', id: 'project-123' });

      expect(result.success).toBe(true);
      expect(result.id).toBe('project-123');
    });

    it('should remove a project by name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-456',
        name: 'My Project'
      });

      const result = await removeItem({ itemType: 'project', name: 'My Project' });

      expect(result.success).toBe(true);
    });

    it('should use name as fallback when ID search fails', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'fallback-id',
        name: 'Fallback Task'
      });

      const result = await removeItem({
        itemType: 'task',
        id: 'non-existent',
        name: 'Fallback Task'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle item not found', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await removeItem({ itemType: 'task', id: 'non-existent' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus script execution failed');
    });

    it('should handle script error response', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Script error occurred'
      });

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script error occurred');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await removeItem({ itemType: 'task', id: 'task-123' });

      expect(result.success).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should return error when neither id nor name provided for task', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Either id or name must be provided'
      });

      const result = await removeItem({ itemType: 'task' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('id or name must be provided');
    });

    it('should return error when neither id nor name provided for project', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Either id or name must be provided'
      });

      const result = await removeItem({ itemType: 'project' });

      expect(result.success).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should handle special characters in ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'escaped',
        name: 'Task'
      });

      const result = await removeItem({
        itemType: 'task',
        id: 'id-with-special-chars'
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: '123',
        name: 'Escaped'
      });

      const result = await removeItem({
        itemType: 'task',
        name: 'Task with special chars'
      });

      expect(result.success).toBe(true);
    });
  });
});
