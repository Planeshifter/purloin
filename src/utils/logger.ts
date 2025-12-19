import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';
import type { DownloadTask, DownloadResult, CliOptions, DownloadSummary } from '../types/index.ts';

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
    console.log(`  ${chalk.green('Successful:')} ${summary.successful}`);
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
