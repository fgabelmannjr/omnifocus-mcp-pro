import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../src/tools/primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: vi.fn()
}));

vi.mock('../../src/tools/primitives/addProject.js', () => ({
  addProject: vi.fn()
}));

import { addOmniFocusTask } from '../../src/tools/primitives/addOmniFocusTask.js';
import { addProject } from '../../src/tools/primitives/addProject.js';
import { batchAddItems } from '../../src/tools/primitives/batchAddItems.js';

const mockAddOmniFocusTask = vi.mocked(addOmniFocusTask);
const mockAddProject = vi.mocked(addProject);

describe('batchAddItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should return error for non-array input', async () => {
      const result = await batchAddItems(
        'not an array' as unknown as Parameters<typeof batchAddItems>[0]
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be an array');
      expect(result.results).toEqual([]);
    });

    it('should return error for empty array', async () => {
      const result = await batchAddItems([]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
      expect(result.results).toEqual([]);
    });
  });

  describe('batch task creation', () => {
    it('should create multiple tasks successfully', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-1' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].id).toBe('task-1');
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].id).toBe('task-2');
    });

    it('should handle partial failures in batch', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed to create task' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      // Overall success because at least one succeeded
      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('Failed to create task');
    });

    it('should return false success when all items fail', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: false, error: 'Failed 1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed 2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('batch project creation', () => {
    it('should create multiple projects successfully', async () => {
      mockAddProject
        .mockResolvedValueOnce({ success: true, projectId: 'project-1' })
        .mockResolvedValueOnce({ success: true, projectId: 'project-2' });

      const result = await batchAddItems([
        { type: 'project', name: 'Project 1' },
        { type: 'project', name: 'Project 2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].id).toBe('project-1');
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].id).toBe('project-2');
    });
  });

  describe('mixed batch (tasks and projects)', () => {
    it('should create mix of tasks and projects', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'task-1' });
      mockAddProject.mockResolvedValue({ success: true, projectId: 'project-1' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'project', name: 'Project 1' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockAddOmniFocusTask).toHaveBeenCalledTimes(1);
      expect(mockAddProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('task hierarchy with tempId', () => {
    it('should create parent task before child task using tempId', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'real-parent-id' })
        .mockResolvedValueOnce({ success: true, taskId: 'real-child-id' });

      const result = await batchAddItems([
        { type: 'task', name: 'Parent Task', tempId: 'temp-parent', hierarchyLevel: 0 },
        { type: 'task', name: 'Child Task', parentTempId: 'temp-parent', hierarchyLevel: 1 }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);

      // Verify child was called with resolved parent ID
      expect(mockAddOmniFocusTask).toHaveBeenCalledTimes(2);
    });

    it('should handle multi-level hierarchy', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'grandparent-id' })
        .mockResolvedValueOnce({ success: true, taskId: 'parent-id' })
        .mockResolvedValueOnce({ success: true, taskId: 'child-id' });

      const result = await batchAddItems([
        { type: 'task', name: 'Grandparent', tempId: 'temp-gp', hierarchyLevel: 0 },
        {
          type: 'task',
          name: 'Parent',
          tempId: 'temp-p',
          parentTempId: 'temp-gp',
          hierarchyLevel: 1
        },
        { type: 'task', name: 'Child', parentTempId: 'temp-p', hierarchyLevel: 2 }
      ]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every((r) => r.success)).toBe(true);
    });

    it('should fail items with unknown parentTempId', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Orphan Task', parentTempId: 'nonexistent-temp-id' }
      ]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Unknown parentTempId');
    });
  });

  describe('cycle detection', () => {
    it('should detect and fail cyclic tempId references', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Task A', tempId: 'a', parentTempId: 'b' },
        { type: 'task', name: 'Task B', tempId: 'b', parentTempId: 'a' }
      ]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Cycle detected');
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('Cycle detected');
    });

    it('should detect self-referencing cycle', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Self Ref', tempId: 'self', parentTempId: 'self' }
      ]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Cycle detected');
    });

    it('should detect longer cycle chains', async () => {
      const result = await batchAddItems([
        { type: 'task', name: 'Task A', tempId: 'a', parentTempId: 'c' },
        { type: 'task', name: 'Task B', tempId: 'b', parentTempId: 'a' },
        { type: 'task', name: 'Task C', tempId: 'c', parentTempId: 'b' }
      ]);

      expect(result.success).toBe(false);
      // All items should fail due to cycle
      expect(result.results.every((r) => !r.success)).toBe(true);
    });
  });

  describe('results indexing', () => {
    it('should maintain original array indices in results', async () => {
      mockAddOmniFocusTask
        .mockResolvedValueOnce({ success: true, taskId: 'task-0' })
        .mockResolvedValueOnce({ success: false, error: 'Error on task 1' })
        .mockResolvedValueOnce({ success: true, taskId: 'task-2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 0' },
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].id).toBe('task-0');
      expect(result.results[1].error).toContain('Error on task 1');
      expect(result.results[2].id).toBe('task-2');
    });
  });

  describe('error handling', () => {
    it('should handle thrown errors from addOmniFocusTask', async () => {
      mockAddOmniFocusTask.mockRejectedValue(new Error('Unexpected error'));

      const result = await batchAddItems([{ type: 'task', name: 'Task' }]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Unexpected error');
    });

    it('should handle thrown errors from addProject', async () => {
      mockAddProject.mockRejectedValue(new Error('Project error'));

      const result = await batchAddItems([{ type: 'project', name: 'Project' }]);

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Project error');
    });

    it('should continue processing after individual item errors', async () => {
      mockAddOmniFocusTask
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ success: true, taskId: 'task-2' });

      const result = await batchAddItems([
        { type: 'task', name: 'Task 1' },
        { type: 'task', name: 'Task 2' }
      ]);

      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(true);
    });
  });

  describe('property passthrough', () => {
    it('should pass all task properties to addOmniFocusTask', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'task-1' });

      await batchAddItems([
        {
          type: 'task',
          name: 'Full Task',
          note: 'Task note',
          dueDate: '2024-12-31T00:00:00Z',
          deferDate: '2024-12-01T00:00:00Z',
          flagged: true,
          estimatedMinutes: 60,
          tags: ['Work', 'Important'],
          projectName: 'My Project'
        }
      ]);

      expect(mockAddOmniFocusTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Full Task',
          note: 'Task note',
          dueDate: '2024-12-31T00:00:00Z',
          deferDate: '2024-12-01T00:00:00Z',
          flagged: true,
          estimatedMinutes: 60,
          tags: ['Work', 'Important'],
          projectName: 'My Project'
        })
      );
    });

    it('should pass all project properties to addProject', async () => {
      mockAddProject.mockResolvedValue({ success: true, projectId: 'project-1' });

      await batchAddItems([
        {
          type: 'project',
          name: 'Full Project',
          note: 'Project note',
          dueDate: '2024-12-31T00:00:00Z',
          deferDate: '2024-12-01T00:00:00Z',
          flagged: true,
          estimatedMinutes: 480,
          tags: ['Q1', 'Priority'],
          folderName: 'Work',
          sequential: true
        }
      ]);

      expect(mockAddProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Full Project',
          note: 'Project note',
          dueDate: '2024-12-31T00:00:00Z',
          deferDate: '2024-12-01T00:00:00Z',
          flagged: true,
          estimatedMinutes: 480,
          tags: ['Q1', 'Priority'],
          folderName: 'Work',
          sequential: true
        })
      );
    });
  });
});
