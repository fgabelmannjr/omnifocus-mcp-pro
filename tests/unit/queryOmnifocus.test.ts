import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import { queryOmnifocus } from '../../src/tools/primitives/queryOmnifocus.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('queryOmnifocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should return error for missing entity parameter', async () => {
      const result = await queryOmnifocus({} as Parameters<typeof queryOmnifocus>[0]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Entity parameter is required');
    });

    it('should return error for null params', async () => {
      const result = await queryOmnifocus(null as unknown as Parameters<typeof queryOmnifocus>[0]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Entity parameter is required');
    });

    it('should return error for invalid entity type', async () => {
      const result = await queryOmnifocus({
        entity: 'invalid' as 'tasks'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid entity type');
    });
  });

  describe('querying tasks', () => {
    it('should query all tasks', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [
          { id: 'task-1', name: 'Task 1', flagged: false },
          { id: 'task-2', name: 'Task 2', flagged: true }
        ],
        count: 2
      });

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should filter tasks by flagged status', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Flagged Task', flagged: true }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { flagged: true }
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should filter tasks by project name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Project Task', projectName: 'My Project' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { projectName: 'My Project' }
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should filter tasks by project ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task', projectId: 'project-123' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { projectId: 'project-123' }
      });

      expect(result.success).toBe(true);
    });

    it('should filter tasks by tags', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Tagged Task', tagNames: ['Work'] }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { tags: ['Work'] }
      });

      expect(result.success).toBe(true);
    });

    it('should filter tasks by status', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Available Task', taskStatus: 'Available' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { status: ['Available'] }
      });

      expect(result.success).toBe(true);
    });

    it('should filter tasks by due date', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Due Soon', dueDate: '2024-12-31' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { dueWithin: 7 }
      });

      expect(result.success).toBe(true);
    });

    it('should filter tasks by hasNote', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task with Note', note: 'Some note' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        filters: { hasNote: true }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('querying projects', () => {
    it('should query all projects', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [
          { id: 'project-1', name: 'Project 1', status: 'Active' },
          { id: 'project-2', name: 'Project 2', status: 'OnHold' }
        ],
        count: 2
      });

      const result = await queryOmnifocus({ entity: 'projects' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should filter projects by folder ID', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'project-1', name: 'Project in Folder', folderId: 'folder-123' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'projects',
        filters: { folderId: 'folder-123' }
      });

      expect(result.success).toBe(true);
    });

    it('should filter projects by status', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'project-1', name: 'Active Project', status: 'Active' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'projects',
        filters: { status: ['Active'] }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('querying folders', () => {
    it('should query all folders', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [
          { id: 'folder-1', name: 'Folder 1', projectCount: 5 },
          { id: 'folder-2', name: 'Folder 2', projectCount: 3 }
        ],
        count: 2
      });

      const result = await queryOmnifocus({ entity: 'folders' });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });
  });

  describe('query options', () => {
    it('should include completed items when requested', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Completed Task', taskStatus: 'Completed' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        includeCompleted: true
      });

      expect(result.success).toBe(true);
    });

    it('should apply limit to results', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task 1' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        limit: 10
      });

      expect(result.success).toBe(true);
    });

    it('should sort results by field', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [
          { id: 'task-1', name: 'A Task' },
          { id: 'task-2', name: 'B Task' }
        ],
        count: 2
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(result.success).toBe(true);
    });

    it('should return only count in summary mode', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        count: 42
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        summary: true
      });

      expect(result.success).toBe(true);
      expect(result.items).toBeUndefined();
      expect(result.count).toBe(42);
    });

    it('should request specific fields', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        items: [{ id: 'task-1', name: 'Task 1' }],
        count: 1
      });

      const result = await queryOmnifocus({
        entity: 'tasks',
        fields: ['id', 'name', 'flagged']
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle script error response', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        error: 'Script execution error'
      });

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Script execution error');
    });

    it('should handle execution rejection', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus not available'));

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus not available');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await queryOmnifocus({ entity: 'tasks' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown error');
    });
  });
});
