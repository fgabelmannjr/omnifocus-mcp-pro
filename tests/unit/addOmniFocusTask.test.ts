import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import { addOmniFocusTask } from '../../src/tools/primitives/addOmniFocusTask.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('addOmniFocusTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful task creation', () => {
    it('should create task with name only (default placement in inbox)', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        name: 'Buy groceries',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: 'Buy groceries' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task-123');
        expect(result.placement).toBe('inbox');
      }
      expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should create task in a project', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-456',
        name: 'Task in project',
        placement: 'project'
      });

      const result = await addOmniFocusTask({
        name: 'Task in project',
        projectName: 'My Project'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.placement).toBe('project');
      }
    });

    it('should create task as subtask of parent task', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-789',
        name: 'Subtask',
        placement: 'parent'
      });

      const result = await addOmniFocusTask({
        name: 'Subtask',
        parentTaskId: 'parent-task-id'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.placement).toBe('parent');
      }
    });

    it('should create task with all properties', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-full',
        name: 'Full task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Full task',
        note: 'Task notes here',
        dueDate: tomorrow.toISOString(),
        deferDate: new Date().toISOString(),
        flagged: true,
        estimatedMinutes: 30,
        tags: ['Work', 'Important']
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskId).toBe('task-full');
      }
    });

    it('should create task with parent task by name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-byname',
        name: 'Child task',
        placement: 'parent'
      });

      const result = await addOmniFocusTask({
        name: 'Child task',
        parentTaskName: 'Parent Task'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should return error for empty name', async () => {
      const result = await addOmniFocusTask({ name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Task name is required');
      }
      expect(mockExecuteOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for whitespace-only name', async () => {
      const result = await addOmniFocusTask({ name: '   ' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Task name is required');
      }
    });

    it('should return error for null params', async () => {
      const result = await addOmniFocusTask(null as unknown as { name: string });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Task name is required');
      }
    });
  });

  describe('special characters in names', () => {
    it('should handle quotes in task name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-quotes',
        name: "John's task",
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: "John's task" });

      expect(result.success).toBe(true);
      expect(mockExecuteOmniJS).toHaveBeenCalled();
    });

    it('should handle double quotes in task name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-dquotes',
        name: 'Task "Alpha"',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: 'Task "Alpha"' });

      expect(result.success).toBe(true);
    });

    it('should handle backslashes in task name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-backslash',
        name: 'C:\\Projects',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: 'C:\\Projects' });

      expect(result.success).toBe(true);
    });

    it('should handle newlines in note', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-newline',
        name: 'Task with note',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({
        name: 'Task with note',
        note: 'Line 1\nLine 2\nLine 3'
      });

      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-unicode',
        name: '工作任务',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: '工作任务' });

      expect(result.success).toBe(true);
    });

    it('should handle emoji in task name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-emoji',
        name: '📝 Write report',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: '📝 Write report' });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error when project not found', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Project not found: NonExistent'
      });

      const result = await addOmniFocusTask({
        name: 'Test task',
        projectName: 'NonExistent'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Project not found');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await addOmniFocusTask({ name: 'Test' });

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

      const result = await addOmniFocusTask({ name: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await addOmniFocusTask({ name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('response properties', () => {
    it('should return task with all required fields', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        taskId: 'task-full',
        name: 'Complete task',
        placement: 'inbox'
      });

      const result = await addOmniFocusTask({ name: 'Complete task' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('taskId');
        expect(result).toHaveProperty('placement');
      }
    });
  });
});
