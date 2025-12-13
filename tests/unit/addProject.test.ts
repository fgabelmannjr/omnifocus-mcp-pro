import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

import { addProject } from '../../src/tools/primitives/addProject.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('addProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful project creation', () => {
    it('should create project with name only', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-123',
        name: 'My Project'
      });

      const result = await addProject({ name: 'My Project' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.projectId).toBe('project-123');
      }
      expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should create project in a folder', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-456',
        name: 'Work Project'
      });

      const result = await addProject({
        name: 'Work Project',
        folderName: 'Work'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.projectId).toBe('project-456');
      }
    });

    it('should create sequential project', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-seq',
        name: 'Sequential Project'
      });

      const result = await addProject({
        name: 'Sequential Project',
        sequential: true
      });

      expect(result.success).toBe(true);
    });

    it('should create parallel project (sequential=false)', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-par',
        name: 'Parallel Project'
      });

      const result = await addProject({
        name: 'Parallel Project',
        sequential: false
      });

      expect(result.success).toBe(true);
    });

    it('should create project with all properties', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-full',
        name: 'Full Project'
      });

      const result = await addProject({
        name: 'Full Project',
        note: 'Project notes here',
        dueDate: tomorrow.toISOString(),
        deferDate: new Date().toISOString(),
        flagged: true,
        estimatedMinutes: 120,
        tags: ['Work', 'Q1'],
        folderName: 'Business',
        sequential: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.projectId).toBe('project-full');
      }
    });
  });

  describe('input validation', () => {
    it('should return error for empty name', async () => {
      const result = await addProject({ name: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Project name is required');
      }
      expect(mockExecuteOmniJS).not.toHaveBeenCalled();
    });

    it('should return error for whitespace-only name', async () => {
      const result = await addProject({ name: '   ' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Project name is required');
      }
    });

    it('should return error for null params', async () => {
      const result = await addProject(null as unknown as { name: string });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Project name is required');
      }
    });
  });

  describe('special characters in names', () => {
    it('should handle quotes in project name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-quotes',
        name: "John's Project"
      });

      const result = await addProject({ name: "John's Project" });

      expect(result.success).toBe(true);
    });

    it('should handle double quotes in project name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-dquotes',
        name: 'Project "Alpha"'
      });

      const result = await addProject({ name: 'Project "Alpha"' });

      expect(result.success).toBe(true);
    });

    it('should handle backslashes in project name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-backslash',
        name: 'C:\\Projects\\Main'
      });

      const result = await addProject({ name: 'C:\\Projects\\Main' });

      expect(result.success).toBe(true);
    });

    it('should handle newlines in note', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-newline',
        name: 'Project with notes'
      });

      const result = await addProject({
        name: 'Project with notes',
        note: 'Line 1\nLine 2\nLine 3'
      });

      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-unicode',
        name: '项目管理'
      });

      const result = await addProject({ name: '项目管理' });

      expect(result.success).toBe(true);
    });

    it('should handle emoji in project name', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-emoji',
        name: '📁 Main Project'
      });

      const result = await addProject({ name: '📁 Main Project' });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error when folder not found', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: false,
        error: 'Folder not found: NonExistent'
      });

      const result = await addProject({
        name: 'Test Project',
        folderName: 'NonExistent'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Folder not found');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniJS.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await addProject({ name: 'Test' });

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

      const result = await addProject({ name: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniJS.mockRejectedValue('String error');

      const result = await addProject({ name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('response properties', () => {
    it('should return project with all required fields', async () => {
      mockExecuteOmniJS.mockResolvedValue({
        success: true,
        projectId: 'project-full',
        name: 'Complete Project'
      });

      const result = await addProject({ name: 'Complete Project' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('projectId');
      }
    });
  });
});
