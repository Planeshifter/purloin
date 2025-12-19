// Supported ecosystem types
export const ECOSYSTEM_TYPES = [
  'npm',
  'pypi',
  'maven',
  'gem',
  'cargo',
  'nuget',
  'golang',
  'hex',
  'vscode',
  'chrome',
  'composer',
] as const;

export type EcosystemType = (typeof ECOSYSTEM_TYPES)[number];

// Parsed PURL with required version
export interface ParsedPurl {
  type: EcosystemType;
  namespace: string | null;
  name: string;
  version: string;
  qualifiers: Record<string, string> | null;
  subpath: string | null;
  raw: string;
}

// Download task
export interface DownloadTask {
  purl: ParsedPurl;
  downloadUrl: string;
  outputPath: string;
  filename: string;
}

// Download result
export interface DownloadResult {
  task: DownloadTask;
  success: boolean;
  error?: Error;
  bytesDownloaded?: number;
  duration?: number;
  extractedPath?: string;
}

// Download summary
export interface DownloadSummary {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ purl: string; error: Error }>;
}

// CLI options
export interface CliOptions {
  file?: string;
  stdin: boolean;
  output: string;
  concurrency: number;
  timeout: number;
  retry: number;
  continueOnError: boolean;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
  extract: boolean;
}

// Registry handler interface
export interface RegistryHandler {
  readonly type: EcosystemType;
  getDownloadUrl(purl: ParsedPurl): Promise<string>;
  getOutputFilename(purl: ParsedPurl): string;
}

// Error types
export class PurlDownloaderError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PurlDownloaderError';
  }
}

export class PurlParseError extends PurlDownloaderError {
  constructor(purl: string, details: string) {
    super(`Invalid PURL "${purl}": ${details}`, 'PURL_PARSE_ERROR');
  }
}

export class UnsupportedEcosystemError extends PurlDownloaderError {
  constructor(type: string) {
    super(`Unsupported ecosystem: ${type}`, 'UNSUPPORTED_ECOSYSTEM');
  }
}

export class DownloadError extends PurlDownloaderError {
  constructor(
    public readonly purl: string,
    public readonly url: string,
    public readonly statusCode?: number,
    details?: string
  ) {
    super(`Download failed for ${purl}: ${details || `HTTP ${statusCode}`}`, 'DOWNLOAD_ERROR');
  }
}

export class NetworkError extends PurlDownloaderError {
  constructor(url: string, cause: Error) {
    super(`Network error fetching ${url}: ${cause.message}`, 'NETWORK_ERROR');
    this.cause = cause;
  }
}

export class ExtractionError extends PurlDownloaderError {
  constructor(filePath: string, details: string) {
    super(`Extraction failed for ${filePath}: ${details}`, 'EXTRACTION_ERROR');
  }
}
