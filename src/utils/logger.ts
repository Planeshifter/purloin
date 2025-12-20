import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';
import type {
  DownloadTask,
  DownloadResult,
  CliOptions,
  DownloadSummary,
  RecoveryResult,
} from '../types/index.ts';

export class Logger {
  private spinner: Ora | null = null;
  private options: CliOptions;
  private completed = 0;
  private total = 0;
  private activeTasks: Set<string> = new Set();

  constructor(options: CliOptions) {
    this.options = options;
  }

  setTotal(total: number): void {
    this.total = total;
  }

  info(message: string): void {
    if (!this.options.quiet) {
      console.log(chalk.blue('info'), message);
    }
  }

  verbose(message: string): void {
    if (this.options.verbose && !this.options.quiet) {
      console.log(chalk.gray('verbose'), message);
    }
  }

  warn(message: string): void {
    console.log(chalk.yellow('warn'), message);
  }

  error(message: string): void {
    console.error(chalk.red('error'), message);
  }

  startTask(task: DownloadTask): void {
    if (this.options.quiet) return;

    this.activeTasks.add(task.purl.raw);
    this.updateSpinner();
  }

  private updateSpinner(): void {
    if (this.options.quiet) return;

    const activeCount = this.activeTasks.size;
    if (activeCount === 0) {
      if (this.spinner) {
        this.spinner.stop();
        this.spinner = null;
      }
      return;
    }

    const progress = `[${this.completed + activeCount}/${this.total}]`;
    const taskList = Array.from(this.activeTasks).slice(0, 3);
    const text =
      activeCount === 1
        ? `${progress} Downloading ${taskList[0]}`
        : `${progress} Downloading ${activeCount} packages...`;

    if (!this.spinner) {
      this.spinner = ora({ text, prefixText: '' }).start();
    } else {
      this.spinner.text = text;
    }
  }

  completeTask(task: DownloadTask, result: DownloadResult): void {
    this.completed++;
    this.activeTasks.delete(task.purl.raw);

    if (!this.options.quiet) {
      // Stop spinner temporarily to print result
      if (this.spinner) {
        this.spinner.stop();
      }

      const sizeStr = result.bytesDownloaded ? this.formatBytes(result.bytesDownloaded) : '';
      const timeStr = result.duration ? this.formatDuration(result.duration) : '';
      const details = [sizeStr, timeStr].filter(Boolean).join(', ');

      console.log(
        chalk.green('✔'),
        `${task.purl.type}/${task.filename}` + (details ? chalk.gray(` (${details})`) : '')
      );

      // Restart spinner if there are still active tasks
      this.spinner = null;
      this.updateSpinner();
    }
  }

  failTask(task: DownloadTask, error: Error): void {
    this.completed++;
    this.activeTasks.delete(task.purl.raw);

    if (!this.options.quiet) {
      if (this.spinner) {
        this.spinner.stop();
      }

      console.log(chalk.red('✖'), `${task.purl.raw} - ${error.message}`);

      this.spinner = null;
      this.updateSpinner();
    }
  }

  startRecovery(task: DownloadTask): void {
    if (this.options.quiet) return;

    if (this.spinner) {
      this.spinner.stop();
    }

    console.log(chalk.yellow('↳'), `Attempting recovery for ${task.purl.raw}...`);

    this.spinner = null;
    this.updateSpinner();
  }

  completeRecovery(
    task: DownloadTask,
    result: DownloadResult,
    recoveryResult: RecoveryResult
  ): void {
    this.completed++;
    this.activeTasks.delete(task.purl.raw);

    if (!this.options.quiet) {
      if (this.spinner) {
        this.spinner.stop();
      }

      // Show which sources were tried
      if (this.options.verbose) {
        console.log('');
        console.log(chalk.gray('  Recovery sources:'));
        for (const source of recoveryResult.sources) {
          const statusIcon =
            source.status === 'found'
              ? chalk.green('✓')
              : source.status === 'partial'
                ? chalk.yellow('◐')
                : source.status === 'metadata_only'
                  ? chalk.gray('○')
                  : chalk.red('✗');
          const details = source.archiveDate ? chalk.gray(` (${source.archiveDate})`) : '';
          console.log(`  ${statusIcon} ${source.source}${details}`);
        }
        console.log('');
      }

      const sizeStr = result.bytesDownloaded ? this.formatBytes(result.bytesDownloaded) : '';
      const timeStr = result.duration ? this.formatDuration(result.duration) : '';
      const details = [sizeStr, timeStr].filter(Boolean).join(', ');
      const source = result.recoveredFrom ? chalk.cyan(` via ${result.recoveredFrom}`) : '';

      console.log(
        chalk.green('✔'),
        `${task.purl.type}/${task.filename}${source}` + (details ? chalk.gray(` (${details})`) : '')
      );

      this.spinner = null;
      this.updateSpinner();
    }
  }

  failRecovery(task: DownloadTask, recoveryResult: RecoveryResult): void {
    if (!this.options.quiet) {
      if (this.spinner) {
        this.spinner.stop();
      }

      // Show which sources were tried
      if (this.options.verbose) {
        console.log(chalk.gray('  Recovery sources:'));
        for (const source of recoveryResult.sources) {
          const statusIcon =
            source.status === 'found'
              ? chalk.green('✓')
              : source.status === 'partial'
                ? chalk.yellow('◐')
                : source.status === 'metadata_only'
                  ? chalk.gray('○')
                  : source.status === 'not_found'
                    ? chalk.gray('-')
                    : chalk.red('✗');
          const errorMsg = source.error ? chalk.red(` (${source.error})`) : '';
          console.log(`  ${statusIcon} ${source.source}${errorMsg}`);
        }
      }

      this.spinner = null;
      this.updateSpinner();
    }
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.clear();
      this.spinner.stop();
      this.spinner = null;
    }
    this.activeTasks.clear();
  }

  summary(summary: DownloadSummary): void {
    // Ensure spinner is stopped before printing summary
    this.stop();

    if (this.options.quiet && summary.errors.length === 0) return;

    console.log('');
    console.log(chalk.bold('Download Summary:'));
    console.log(`  Total:      ${summary.total}`);

    // Show successful count with recovery info
    const recoveredNote =
      summary.recovered > 0 ? chalk.cyan(` (${summary.recovered} recovered)`) : '';
    console.log(`  ${chalk.green('Successful:')} ${summary.successful}${recoveredNote}`);
    console.log(`  ${chalk.red('Failed:')}     ${summary.failed}`);

    if (summary.errors.length > 0) {
      console.log('');
      console.log(chalk.red('Failed downloads:'));
      summary.errors.forEach(({ purl, error }) => {
        console.log(`  - ${purl}: ${error.message}`);
      });
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
