import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadQueue } from '../../src/downloader/queue.ts';
import { DownloadTask, CliOptions } from '../../src/types/index.ts';
import { Logger } from '../../src/utils/logger.ts';

// Mock the fetcher
vi.mock('../../src/downloader/fetcher.js', () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from '../../src/downloader/fetcher.ts';

const mockFetchWithRetry = vi.mocked(fetchWithRetry);

describe('DownloadQueue', () => {
  const defaultOptions: CliOptions = {
    stdin: false,
    output: './output',
    concurrency: 2,
    timeout: 30000,
    retry: 3,
    continueOnError: false,
    dryRun: false,
    verbose: false,
    quiet: true,
  };

  const mockLogger = {
    setTotal: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    startTask: vi.fn(),
    completeTask: vi.fn(),
    failTask: vi.fn(),
    summary: vi.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithRetry.mockReset();
  });

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

  it('should process tasks successfully', async () => {
    mockFetchWithRetry.mockResolvedValue(1000);

    const queue = new DownloadQueue(defaultOptions, mockLogger);
    const task = createTask('test-package');

    const result = await queue.add(task);

    expect(result.success).toBe(true);
    expect(result.bytesDownloaded).toBe(1000);
    expect(result.task).toBe(task);
    expect(mockLogger.startTask).toHaveBeenCalledWith(task);
    expect(mockLogger.completeTask).toHaveBeenCalled();
  });

  it('should handle failed tasks', async () => {
    const error = new Error('Download failed');
    mockFetchWithRetry.mockRejectedValue(error);

    const queue = new DownloadQueue(defaultOptions, mockLogger);
    const task = createTask('failing-package');

    const result = await queue.add(task);

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(mockLogger.failTask).toHaveBeenCalledWith(task, error);
  });

  it('should respect concurrency limit', async () => {
    let concurrentCount = 0;
    let maxConcurrent = 0;

    mockFetchWithRetry.mockImplementation(async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 50));
      concurrentCount--;
      return 100;
    });

    const queue = new DownloadQueue({ ...defaultOptions, concurrency: 2 }, mockLogger);

    const tasks = [createTask('pkg1'), createTask('pkg2'), createTask('pkg3'), createTask('pkg4')];

    await Promise.all(tasks.map((task) => queue.add(task)));

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('should track pending and size correctly', async () => {
    let resolvers: (() => void)[] = [];

    mockFetchWithRetry.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolvers.push(() => resolve(100));
        })
    );

    const queue = new DownloadQueue(defaultOptions, mockLogger);

    const promise1 = queue.add(createTask('pkg1'));
    const promise2 = queue.add(createTask('pkg2'));

    // Wait for tasks to start
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(queue.pending).toBeGreaterThan(0);

    // Resolve all tasks
    resolvers.forEach((r) => r());
    await Promise.all([promise1, promise2]);

    expect(queue.pending).toBe(0);
  });

  it('should collect all results via waitForAll', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(200)
      .mockRejectedValueOnce(new Error('Failed'));

    const queue = new DownloadQueue(defaultOptions, mockLogger);

    queue.add(createTask('pkg1'));
    queue.add(createTask('pkg2'));
    queue.add(createTask('pkg3'));

    const results = await queue.waitForAll();

    expect(results).toHaveLength(3);
    expect(results.filter((r) => r.success)).toHaveLength(2);
    expect(results.filter((r) => !r.success)).toHaveLength(1);
  });

  it('should clear pending tasks', async () => {
    mockFetchWithRetry.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const queue = new DownloadQueue(defaultOptions, mockLogger);

    queue.add(createTask('pkg1'));
    queue.add(createTask('pkg2'));

    queue.clear();

    expect(queue.size).toBe(0);
  });

  it('should pass correct options to fetcher', async () => {
    mockFetchWithRetry.mockResolvedValue(100);

    const options: CliOptions = {
      ...defaultOptions,
      timeout: 60000,
      retry: 5,
    };

    const queue = new DownloadQueue(options, mockLogger);
    const task = createTask('test');

    await queue.add(task);

    expect(mockFetchWithRetry).toHaveBeenCalledWith(task.downloadUrl, task.outputPath, {
      timeout: 60000,
      retries: 5,
    });
  });
});
