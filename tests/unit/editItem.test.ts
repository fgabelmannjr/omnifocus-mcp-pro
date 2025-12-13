import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import { editItem } from '../../src/tools/primitives/editItem.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('editItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('task editing', () => {
    it('should rename task by ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'New Name',
        changedProperties: 'name'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: 'New Name'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task-123');
        expect(result.changedProperties).toContain('name');
      }
    });

    it('should update task note', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'note'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newNote: 'Updated note content'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.changedProperties).toContain('note');
      }
    });

    it('should mark task as completed', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'status (completed)'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newStatus: 'completed'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.changedProperties).toContain('completed');
      }
    });

    it('should mark task as dropped', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'status (dropped)'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newStatus: 'dropped'
      });

      expect(result.success).toBe(true);
    });

    it('should mark task as incomplete', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'status (incomplete)'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newStatus: 'incomplete'
      });

      expect(result.success).toBe(true);
    });

    it('should flag task', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'flagged'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newFlagged: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.changedProperties).toContain('flagged');
      }
    });

    it('should set due date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'due date'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newDueDate: tomorrow.toISOString()
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.changedProperties).toContain('due date');
      }
    });

    it('should clear due date', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'due date'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newDueDate: ''
      });

      expect(result.success).toBe(true);
    });

    it('should set defer date', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'defer date'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newDeferDate: new Date().toISOString()
      });

      expect(result.success).toBe(true);
    });

    it('should add tags to task', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'tags (added)'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        addTags: ['Work', 'Important']
      });

      expect(result.success).toBe(true);
    });

    it('should remove tags from task', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'tags (removed)'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        removeTags: ['Old Tag']
      });

      expect(result.success).toBe(true);
    });

    it('should replace all tags on task', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'tags (replaced)'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        replaceTags: ['New Tag 1', 'New Tag 2']
      });

      expect(result.success).toBe(true);
    });

    it('should update multiple properties at once', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'New Name',
        changedProperties: 'name, note, flagged'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: 'New Name',
        newNote: 'New note',
        newFlagged: true
      });

      expect(result.success).toBe(true);
    });
  });

  describe('project editing', () => {
    it('should rename project by ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'New Project Name',
        changedProperties: 'name'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newName: 'New Project Name'
      });

      expect(result.success).toBe(true);
    });

    it('should update project status to active', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'status'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newProjectStatus: 'active'
      });

      expect(result.success).toBe(true);
    });

    it('should update project status to onHold', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'status'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newProjectStatus: 'onHold'
      });

      expect(result.success).toBe(true);
    });

    it('should update project status to completed', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'status'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newProjectStatus: 'completed'
      });

      expect(result.success).toBe(true);
    });

    it('should update project status to dropped', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'status'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newProjectStatus: 'dropped'
      });

      expect(result.success).toBe(true);
    });

    it('should update project sequential mode', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'sequential'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newSequential: true
      });

      expect(result.success).toBe(true);
    });

    it('should move project to new folder', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-123',
        name: 'Project',
        changedProperties: 'folder'
      });

      const result = await editItem({
        id: 'project-123',
        itemType: 'project',
        newFolderName: 'New Folder'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should return error when neither id nor name provided', async () => {
      const result = await editItem({
        itemType: 'task',
        newName: 'New Name'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Either id or name must be provided');
      }
      expect(mockExecuteOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for invalid itemType', async () => {
      const result = await editItem({
        id: 'item-123',
        itemType: 'invalid' as 'task',
        newName: 'New Name'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('itemType must be either');
      }
    });

    it('should return error for null params', async () => {
      const result = await editItem(null as unknown as Parameters<typeof editItem>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Parameters object is required');
      }
    });

    it('should return error for missing itemType', async () => {
      const result = await editItem({
        id: 'item-123',
        newName: 'New Name'
      } as Parameters<typeof editItem>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('itemType');
      }
    });
  });

  describe('finding items by name', () => {
    it('should find task by name when ID not provided', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-found',
        name: 'Found Task',
        changedProperties: 'flagged'
      });

      const result = await editItem({
        name: 'Found Task',
        itemType: 'task',
        newFlagged: true
      });

      expect(result.success).toBe(true);
    });

    it('should find project by name when ID not provided', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'project-found',
        name: 'Found Project',
        changedProperties: 'sequential'
      });

      const result = await editItem({
        name: 'Found Project',
        itemType: 'project',
        newSequential: false
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error when item not found', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      const result = await editItem({
        id: 'nonexistent',
        itemType: 'task',
        newName: 'New Name'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: 'New Name'
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

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: 'New Name'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: 'New Name'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('special characters', () => {
    it('should handle quotes in new name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: "Task's new name",
        changedProperties: 'name'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: "Task's new name"
      });

      expect(result.success).toBe(true);
    });

    it('should handle double quotes in new name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task "updated"',
        changedProperties: 'name'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newName: 'Task "updated"'
      });

      expect(result.success).toBe(true);
    });

    it('should handle backslashes in new note', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'note'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newNote: 'Path: C:\\Users\\Work'
      });

      expect(result.success).toBe(true);
    });

    it('should handle newlines in new note', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        id: 'task-123',
        name: 'Task',
        changedProperties: 'note'
      });

      const result = await editItem({
        id: 'task-123',
        itemType: 'task',
        newNote: 'Line 1\nLine 2\nLine 3'
      });

      expect(result.success).toBe(true);
    });
  });
});
