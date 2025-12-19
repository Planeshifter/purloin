import type { CliOptions } from '../types/index.ts';
import { collectPurls } from './input.ts';
import { parsePurls } from '../purl/parser.ts';
import { downloadAll } from '../downloader/index.ts';
import { Logger } from '../utils/logger.ts';

export async function downloadCommand(
  purls: string[],
  rawOptions: Record<string, unknown>
): Promise<void> {
  const options: CliOptions = {
    file: rawOptions.file as string | undefined,
    stdin: rawOptions.stdin as boolean,
    output: rawOptions.output as string,
    concurrency: parseInt(rawOptions.concurrency as string, 10),
    timeout: parseInt(rawOptions.timeout as string, 10),
    retry: parseInt(rawOptions.retry as string, 10),
    continueOnError: rawOptions.continueOnError as boolean,
    dryRun: rawOptions.dryRun as boolean,
    verbose: rawOptions.verbose as boolean,
    quiet: rawOptions.quiet as boolean,
    extract: rawOptions.extract as boolean,
  };

  const logger = new Logger(options);

  try {
    // Collect PURLs from all sources
    const allPurlStrings = await collectPurls(purls, {
      file: options.file,
      stdin: options.stdin,
    });

    if (allPurlStrings.length === 0) {
      logger.error('No PURLs provided. Use --help for usage information.');
      process.exit(1);
    }

    logger.info(`Found ${allPurlStrings.length} PURL(s) to download`);
    logger.verbose(`Output directory: ${options.output}`);
    logger.verbose(`Concurrency: ${options.concurrency}`);

    // Parse PURLs
    const parsedPurls = parsePurls(allPurlStrings);

    // Download all packages
    const summary = await downloadAll(parsedPurls, options, logger);

    // Print summary
    logger.summary(summary);

    // Exit with error code if any downloads failed
    if (summary.failed > 0 && !options.continueOnError) {
      process.exit(1);
    }
  } catch (error) {
    logger.error((error as Error).message);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}
