import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../src/tools/primitives/removeItem.js', () => ({
  removeItem: vi.fn()
}));

import { batchRemoveItems } from '../../src/tools/primitives/batchRemoveItems.js';
import { removeItem } from '../../src/tools/primitives/removeItem.js';

const mockRemoveItem = vi.mocked(removeItem);

describe('batchRemoveItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should return error for non-array input', async () => {
      const result = await batchRemoveItems(
        'not an array' as unknown as Parameters<typeof batchRemoveItems>[0]
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be an array');
      expect(result.results).toEqual([]);
    });

    it('should return error for empty array', async () => {
      const result = await batchRemoveItems([]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
      expect(result.results).toEqual([]);
    });
  });

  describe('batch task removal', () => {
    it('should remove multiple tasks successfully', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-1', name: 'Task 1' })
        .mockResolvedValueOnce({ success: true, id: 'task-2', name: 'Task 2' });

      const result = await batchRemoveItems([
        { id: 'task-1', itemType: 'task' },
        { id: 'task-2', itemType: 'task' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].id).toBe('task-1');
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].id).toBe('task-2');
    });

    it('should handle partial failures in batch', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-1', name: 'Task 1' })
        .mockResolvedValueOnce({ success: false, error: 'Item not found' });

      const result = await batchRemoveItems([
        { id: 'task-1', itemType: 'task' },
        { id: 'nonexistent', itemType: 'task' }
      ]);

      // Overall success because at least one succeeded
      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('not found');
    });

    it('should return false success when all items fail', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: false, error: 'Not found 1' })
        .mockResolvedValueOnce({ success: false, error: 'Not found 2' });

      const result = await batchRemoveItems([
        { id: 'bad-1', itemType: 'task' },
        { id: 'bad-2', itemType: 'task' }
      ]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('batch project removal', () => {
    it('should remove multiple projects successfully', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'project-1', name: 'Project 1' })
        .mockResolvedValueOnce({ success: true, id: 'project-2', name: 'Project 2' });

      const result = await batchRemoveItems([
        { id: 'project-1', itemType: 'project' },
        { id: 'project-2', itemType: 'project' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });
  });

  describe('mixed batch removal', () => {
    it('should remove mix of tasks and projects', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-1', name: 'Task 1' })
        .mockResolvedValueOnce({ success: true, id: 'project-1', name: 'Project 1' });

      const result = await batchRemoveItems([
        { id: 'task-1', itemType: 'task' },
        { id: 'project-1', itemType: 'project' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockRemoveItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('removal by name', () => {
    it('should remove items by name', async () => {
      mockRemoveItem.mockResolvedValueOnce({ success: true, id: 'task-123', name: 'Task by Name' });

      const result = await batchRemoveItems([{ name: 'Task by Name', itemType: 'task' }]);

      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].name).toBe('Task by Name');
    });
  });

  describe('results indexing', () => {
    it('should maintain original array indices in results', async () => {
      mockRemoveItem
        .mockResolvedValueOnce({ success: true, id: 'task-0', name: 'Task 0' })
        .mockResolvedValueOnce({ success: false, error: 'Not found' })
        .mockResolvedValueOnce({ success: true, id: 'task-2', name: 'Task 2' });

      const result = await batchRemoveItems([
        { id: 'task-0', itemType: 'task' },
        { id: 'bad', itemType: 'task' },
        { id: 'task-2', itemType: 'task' }
      ]);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].id).toBe('task-0');
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].id).toBe('task-2');
    });
  });

  describe('error handling', () => {
    it('should handle thrown errors from removeItem', async () => {
      mockRemoveItem.mockRejectedValue(new Error('Unexpected error'));

      const result = await batchRemoveItems([{ id: 'task-1', itemType: 'task' }]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Unexpected error');
    });

    it('should continue processing after individual item errors', async () => {
      mockRemoveItem
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ success: true, id: 'task-2', name: 'Task 2' });

      const result = await batchRemoveItems([
        { id: 'task-1', itemType: 'task' },
        { id: 'task-2', itemType: 'task' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(true);
    });

    it('should handle non-Error thrown values', async () => {
      mockRemoveItem.mockRejectedValue('String error');

      const result = await batchRemoveItems([{ id: 'task-1', itemType: 'task' }]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Unknown error');
    });
  });

  describe('parameter passthrough', () => {
    it('should pass all parameters to removeItem', async () => {
      mockRemoveItem.mockResolvedValue({ success: true, id: 'task-1', name: 'Task' });

      await batchRemoveItems([{ id: 'task-1', name: 'Task', itemType: 'task' }]);

      expect(mockRemoveItem).toHaveBeenCalledWith({
        id: 'task-1',
        name: 'Task',
        itemType: 'task'
      });
    });
  });

  describe('response properties', () => {
    it('should include name in results when available', async () => {
      mockRemoveItem.mockResolvedValue({
        success: true,
        id: 'task-1',
        name: 'Deleted Task'
      });

      const result = await batchRemoveItems([{ id: 'task-1', itemType: 'task' }]);

      expect(result.results[0]).toHaveProperty('id', 'task-1');
      expect(result.results[0]).toHaveProperty('name', 'Deleted Task');
    });
  });
});
