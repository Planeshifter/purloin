#!/usr/bin/env node

import { Command } from 'commander';
import { downloadCommand } from './cli/commands.ts';

const program = new Command();

program
  .name('purloin')
  .description('Download package tarballs from Package URLs (PURLs)')
  .version('1.0.0')
  .argument('[purls...]', 'PURLs to download')
  .option('-f, --file <path>', 'Read PURLs from file (one per line)')
  .option('-s, --stdin', 'Read PURLs from stdin', false)
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-c, --concurrency <number>', 'Max concurrent downloads', '5')
  .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('-r, --retry <number>', 'Number of retries on failure', '3')
  .option('-e, --continue-on-error', 'Continue downloading even if some fail', false)
  .option('-d, --dry-run', 'Show what would be downloaded without downloading', false)
  .option('-x, --extract', 'Extract archives after downloading', false)
  .option('-v, --verbose', 'Verbose output', false)
  .option('-q, --quiet', 'Suppress output except errors', false)
  .action(downloadCommand);

program.parse();
