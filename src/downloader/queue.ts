import PQueue from 'p-queue';
import type { DownloadTask, DownloadResult, CliOptions } from '../types/index.ts';
import { fetchWithRetry } from './fetcher.ts';
import { extractArchive } from '../extractor/index.ts';
import { Logger } from '../utils/logger.ts';

export class DownloadQueue {
  private queue: PQueue;
  private logger: Logger;
  private results: DownloadResult[] = [];
  private options: CliOptions;

  constructor(options: CliOptions, logger: Logger) {
    this.queue = new PQueue({
      concurrency: options.concurrency,
    });
    this.logger = logger;
    this.options = options;
  }

  async add(task: DownloadTask): Promise<DownloadResult> {
    return this.queue.add(async () => {
      const startTime = Date.now();

      this.logger.startTask(task);

      try {
        const bytesDownloaded = await fetchWithRetry(task.downloadUrl, task.outputPath, {
          timeout: this.options.timeout,
          retries: this.options.retry,
        });

        // Extract if enabled
        let extractedPath: string | undefined;
        if (this.options.extract) {
          extractedPath = await extractArchive(task.outputPath, task.purl.type);
          this.logger.verbose(`Extracted to: ${extractedPath}`);
        }

        const result: DownloadResult = {
          task,
          success: true,
          bytesDownloaded,
          duration: Date.now() - startTime,
          extractedPath,
        };

        this.logger.completeTask(task, result);
        this.results.push(result);
        return result;
      } catch (error) {
        const result: DownloadResult = {
          task,
          success: false,
          error: error as Error,
          duration: Date.now() - startTime,
        };

        this.logger.failTask(task, error as Error);
        this.results.push(result);
        return result;
      }
    }) as Promise<DownloadResult>;
  }

  async waitForAll(): Promise<DownloadResult[]> {
    await this.queue.onIdle();
    return this.results;
  }

  get pending(): number {
    return this.queue.pending;
  }

  get size(): number {
    return this.queue.size;
  }

  clear(): void {
    this.queue.clear();
  }
}
