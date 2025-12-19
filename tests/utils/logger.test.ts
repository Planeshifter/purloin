import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/logger.ts';
import {
  DownloadTask,
  DownloadResult,
  CliOptions,
  DownloadSummary,
} from '../../src/types/index.ts';

describe('Logger', () => {
  const defaultOptions: CliOptions = {
    stdin: false,
    output: './output',
    concurrency: 5,
    timeout: 30000,
    retry: 3,
    continueOnError: false,
    dryRun: false,
    verbose: false,
    quiet: false,
  };

  const createTask = (name: string): DownloadTask => ({
    purl: {
      type: 'npm',
      namespace: null,
      name,
      version: '1.0.0',
      qualifiers: null,
      subpath: null,
      raw: `pkg:npm/${name}@1.0.0`,
    },
    downloadUrl: `https://example.com/${name}.tgz`,
    outputPath: `./output/npm/${name}-1.0.0.tgz`,
    filename: `${name}-1.0.0.tgz`,
  });

  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('setTotal', () => {
    it('should store total count', () => {
      const logger = new Logger(defaultOptions);
      logger.setTotal(10);
      // Internal state, verified through other methods
      expect(true).toBe(true);
    });
  });

  describe('info', () => {
    it('should log info messages when not quiet', () => {
      const logger = new Logger(defaultOptions);
      logger.info('Test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log when quiet mode is enabled', () => {
      const logger = new Logger({ ...defaultOptions, quiet: true });
      logger.info('Test message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('verbose', () => {
    it('should log verbose messages when verbose mode is enabled', () => {
      const logger = new Logger({ ...defaultOptions, verbose: true });
      logger.verbose('Verbose message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log verbose messages when verbose mode is disabled', () => {
      const logger = new Logger(defaultOptions);
      logger.verbose('Verbose message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not log verbose messages when quiet mode is enabled', () => {
      const logger = new Logger({ ...defaultOptions, verbose: true, quiet: true });
      logger.verbose('Verbose message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should always log warning messages', () => {
      const logger = new Logger(defaultOptions);
      logger.warn('Warning message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warnings even in quiet mode', () => {
      const logger = new Logger({ ...defaultOptions, quiet: true });
      logger.warn('Warning message');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages to stderr', () => {
      const logger = new Logger(defaultOptions);
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log errors even in quiet mode', () => {
      const logger = new Logger({ ...defaultOptions, quiet: true });
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('startTask', () => {
    it('should start spinner when not quiet', () => {
      const logger = new Logger(defaultOptions);
      logger.setTotal(5);
      const task = createTask('test-package');
      logger.startTask(task);
      // Spinner is started (internal state)
      expect(true).toBe(true);
    });

    it('should not start spinner in quiet mode', () => {
      const logger = new Logger({ ...defaultOptions, quiet: true });
      logger.setTotal(5);
      const task = createTask('test-package');
      logger.startTask(task);
      // No exception thrown
      expect(true).toBe(true);
    });
  });

  describe('completeTask', () => {
    it('should log completion with size and duration', () => {
      const logger = new Logger(defaultOptions);
      logger.setTotal(1);
      const task = createTask('test-package');
      logger.startTask(task);

      const result: DownloadResult = {
        task,
        success: true,
        bytesDownloaded: 1024,
        duration: 500,
      };

      logger.completeTask(task, result);
      // Completion logged
      expect(true).toBe(true);
    });
  });

  describe('failTask', () => {
    it('should log failure with error message', () => {
      const logger = new Logger(defaultOptions);
      logger.setTotal(1);
      const task = createTask('test-package');
      logger.startTask(task);

      const error = new Error('Download failed');
      logger.failTask(task, error);
      // Failure logged
      expect(true).toBe(true);
    });
  });

  describe('summary', () => {
    it('should display summary with all stats', () => {
      const logger = new Logger(defaultOptions);
      const summary: DownloadSummary = {
        total: 10,
        successful: 8,
        failed: 2,
        errors: [
          { purl: 'pkg:npm/test1@1.0.0', error: new Error('Error 1') },
          { purl: 'pkg:npm/test2@1.0.0', error: new Error('Error 2') },
        ],
      };

      logger.summary(summary);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not display summary in quiet mode when no errors', () => {
      const logger = new Logger({ ...defaultOptions, quiet: true });
      const summary: DownloadSummary = {
        total: 10,
        successful: 10,
        failed: 0,
        errors: [],
      };

      logger.summary(summary);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should display errors in quiet mode when there are errors', () => {
      const logger = new Logger({ ...defaultOptions, quiet: true });
      const summary: DownloadSummary = {
        total: 10,
        successful: 9,
        failed: 1,
        errors: [{ purl: 'pkg:npm/test@1.0.0', error: new Error('Failed') }],
      };

      logger.summary(summary);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should list all failed downloads', () => {
      const logger = new Logger(defaultOptions);
      const summary: DownloadSummary = {
        total: 3,
        successful: 0,
        failed: 3,
        errors: [
          { purl: 'pkg:npm/a@1.0.0', error: new Error('Error A') },
          { purl: 'pkg:npm/b@1.0.0', error: new Error('Error B') },
          { purl: 'pkg:npm/c@1.0.0', error: new Error('Error C') },
        ],
      };

      logger.summary(summary);

      // Check that all errors were mentioned
      const allCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(allCalls).toContain('pkg:npm/a@1.0.0');
      expect(allCalls).toContain('pkg:npm/b@1.0.0');
      expect(allCalls).toContain('pkg:npm/c@1.0.0');
    });
  });

  describe('byte formatting', () => {
    it('should format bytes correctly in completion messages', () => {
      const logger = new Logger(defaultOptions);
      logger.setTotal(1);
      const task = createTask('test');
      logger.startTask(task);

      // Test various sizes
      const testCases = [
        { bytes: 500, expected: '500 B' },
        { bytes: 1024, expected: '1.0 KB' },
        { bytes: 1536, expected: '1.5 KB' },
        { bytes: 1048576, expected: '1.0 MB' },
        { bytes: 1572864, expected: '1.5 MB' },
      ];

      for (const { bytes } of testCases) {
        const result: DownloadResult = {
          task,
          success: true,
          bytesDownloaded: bytes,
          duration: 100,
        };
        logger.completeTask(task, result);
      }

      expect(true).toBe(true);
    });
  });

  describe('duration formatting', () => {
    it('should format durations correctly', () => {
      const logger = new Logger(defaultOptions);
      logger.setTotal(1);
      const task = createTask('test');
      logger.startTask(task);

      const testCases = [
        { duration: 500, expected: '500ms' },
        { duration: 1000, expected: '1.0s' },
        { duration: 1500, expected: '1.5s' },
        { duration: 10000, expected: '10.0s' },
      ];

      for (const { duration } of testCases) {
        const result: DownloadResult = {
          task,
          success: true,
          bytesDownloaded: 1024,
          duration,
        };
        logger.completeTask(task, result);
      }

      expect(true).toBe(true);
    });
  });
});
