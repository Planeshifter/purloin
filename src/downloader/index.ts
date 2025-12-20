import { join } from 'node:path';
import type {
  ParsedPurl,
  DownloadTask,
  DownloadResult,
  DownloadSummary,
  CliOptions,
} from '../types/index.ts';
import { getRegistry } from '../registries/index.ts';
import { DownloadQueue } from './queue.ts';
import { Logger } from '../utils/logger.ts';

export async function createDownloadTask(
  purl: ParsedPurl,
  outputDir: string
): Promise<DownloadTask> {
  const registry = getRegistry(purl.type);
  const downloadUrl = await registry.getDownloadUrl(purl);
  const filename = registry.getOutputFilename(purl);

  // Organize by ecosystem: output/npm/lodash-4.17.0.tgz
  const outputPath = join(outputDir, purl.type, filename);

  return {
    purl,
    downloadUrl,
    outputPath,
    filename,
  };
}

export async function downloadAll(
  purls: ParsedPurl[],
  options: CliOptions,
  logger: Logger
): Promise<DownloadSummary> {
  const summary: DownloadSummary = {
    total: purls.length,
    successful: 0,
    failed: 0,
    recovered: 0,
    errors: [],
  };

  logger.setTotal(purls.length);

  // Create download tasks (this may involve API calls for some registries)
  const tasks: DownloadTask[] = [];
  for (const purl of purls) {
    try {
      const task = await createDownloadTask(purl, options.output);
      tasks.push(task);
    } catch (error) {
      summary.failed++;
      summary.errors.push({ purl: purl.raw, error: error as Error });
      logger.error(`Failed to resolve download URL for ${purl.raw}: ${(error as Error).message}`);

      if (!options.continueOnError) {
        return summary;
      }
    }
  }

  // Dry run - just show what would be downloaded
  if (options.dryRun) {
    logger.info(`Dry run - would download${options.extract ? ' and extract' : ''}:`);
    for (const task of tasks) {
      logger.info(`  ${task.purl.raw}`);
      logger.verbose(`    URL: ${task.downloadUrl}`);
      logger.verbose(`    Output: ${task.outputPath}`);
    }
    summary.successful = tasks.length;
    return summary;
  }

  // Download all tasks
  const queue = new DownloadQueue(options, logger);
  const downloadPromises: Promise<DownloadResult>[] = [];

  for (const task of tasks) {
    const promise = queue.add(task);
    downloadPromises.push(promise);

    // If not continuing on error, check results as they complete
    if (!options.continueOnError) {
      promise.then((result) => {
        if (!result.success) {
          queue.clear();
        }
      });
    }
  }

  const results = await Promise.allSettled(downloadPromises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        summary.successful++;
        if (result.value.recoveredFrom) {
          summary.recovered++;
        }
      } else {
        summary.failed++;
        if (result.value.error) {
          summary.errors.push({
            purl: result.value.task.purl.raw,
            error: result.value.error,
          });
        }
      }
    } else {
      summary.failed++;
      summary.errors.push({
        purl: 'unknown',
        error: result.reason as Error,
      });
    }
  }

  return summary;
}
