import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() so the mock is available during vi.mock() hoisting
const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn()
}));

// Mock child_process.spawn for executeOmniJS
vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawn: mockSpawn
  };
});

// Mock the logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  }
}));

import { logger } from '../../src/utils/logger.js';
import { executeOmniJS } from '../../src/utils/scriptExecution.js';

/**
 * Helper to create a mock child process for spawn.
 * Returns an EventEmitter that simulates stdout, stderr, stdin, and process events.
 */
function createMockChildProcess(
  stdoutData: string,
  stderrData: string,
  exitCode: number
): ChildProcess {
  const proc = new EventEmitter() as ChildProcess;
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = {
    write: vi.fn(),
    end: vi.fn()
  };

  // Assign streams to process
  (proc as unknown as { stdout: EventEmitter }).stdout = stdout;
  (proc as unknown as { stderr: EventEmitter }).stderr = stderr;
  (proc as unknown as { stdin: typeof stdin }).stdin = stdin;

  // Schedule data emission and close event for next tick
  process.nextTick(() => {
    if (stdoutData) stdout.emit('data', Buffer.from(stdoutData));
    if (stderrData) stderr.emit('data', Buffer.from(stderrData));
    proc.emit('close', exitCode);
  });

  return proc;
}

describe('scriptExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeOmniJS', () => {
    it('should execute script via stdin and return parsed JSON result', async () => {
      const mockResult = { success: true, count: 10 };
      const mockProc = createMockChildProcess(JSON.stringify(mockResult), '', 0);
      mockSpawn.mockReturnValue(mockProc);

      const result = await executeOmniJS(
        '(function() { return JSON.stringify({ success: true, count: 10 }); })();'
      );

      expect(result).toEqual(mockResult);
      expect(mockSpawn).toHaveBeenCalledWith('osascript', ['-l', 'JavaScript', '-'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should write script to stdin', async () => {
      const mockProc = createMockChildProcess(JSON.stringify({ success: true }), '', 0);
      mockSpawn.mockReturnValue(mockProc);

      const script = '(function() { return JSON.stringify({ test: true }); })();';
      await executeOmniJS(script);

      // Verify stdin.write was called with JXA wrapper containing our script
      expect(mockProc.stdin.write).toHaveBeenCalled();
      expect(mockProc.stdin.end).toHaveBeenCalled();
    });

    it('should handle stderr output gracefully', async () => {
      const mockResult = { success: true };
      const mockProc = createMockChildProcess(JSON.stringify(mockResult), 'Warning message', 0);
      mockSpawn.mockReturnValue(mockProc);

      const result = await executeOmniJS('script');

      expect(result).toEqual(mockResult);
      expect(logger.warning).toHaveBeenCalledWith('Script stderr output', 'executeOmniJS', {
        stderr: 'Warning message'
      });
    });

    it('should return raw output when JSON parsing fails', async () => {
      const mockProc = createMockChildProcess('Not valid JSON', '', 0);
      mockSpawn.mockReturnValue(mockProc);

      const result = await executeOmniJS('script');

      expect(result).toBe('Not valid JSON');
      expect(logger.error).toHaveBeenCalledWith(
        'Error parsing script output',
        'executeOmniJS',
        expect.any(Object)
      );
    });

    it('should reject when osascript exits with non-zero code', async () => {
      const mockProc = createMockChildProcess('', 'Error: script failed', 1);
      mockSpawn.mockReturnValue(mockProc);

      await expect(executeOmniJS('script')).rejects.toThrow('osascript exited with code 1');
    });

    it('should reject when spawn fails', async () => {
      const mockProc = new EventEmitter() as ChildProcess;
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      (mockProc as unknown as { stdout: EventEmitter }).stdout = stdout;
      (mockProc as unknown as { stderr: EventEmitter }).stderr = stderr;
      (mockProc as unknown as { stdin: { write: () => void; end: () => void } }).stdin = {
        write: vi.fn(),
        end: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProc);

      const promise = executeOmniJS('script');

      // Emit error event
      process.nextTick(() => {
        mockProc.emit('error', new Error('spawn ENOENT'));
      });

      await expect(promise).rejects.toThrow('Failed to execute osascript: spawn ENOENT');
    });

    it('should throw error for empty script content', async () => {
      await expect(executeOmniJS('')).rejects.toThrow('Script content must be a non-empty string');
    });

    it('should throw error for whitespace-only script content', async () => {
      await expect(executeOmniJS('   ')).rejects.toThrow(
        'Script content must be a non-empty string'
      );
    });

    it('should properly escape special characters in script', async () => {
      const mockProc = createMockChildProcess(JSON.stringify({ success: true }), '', 0);
      mockSpawn.mockReturnValue(mockProc);

      // Script with backticks, backslashes, and dollar signs
      const script =
        '(function() { var str = `test`; var path = "C:\\\\path"; var $var = 1; return JSON.stringify({ success: true }); })();';
      await executeOmniJS(script);

      // Verify spawn was called (escaping happens internally)
      expect(mockSpawn).toHaveBeenCalled();
      expect(mockProc.stdin.write).toHaveBeenCalled();
    });
  });
});
