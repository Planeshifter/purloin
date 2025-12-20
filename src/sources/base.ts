import type {
  ParsedPurl,
  SourceHandler,
  SourceResult,
  RecoverableEcosystem,
} from '../types/index.ts';

export abstract class BaseSource implements SourceHandler {
  abstract readonly name: string;
  abstract readonly ecosystems: readonly RecoverableEcosystem[];

  abstract probe(purl: ParsedPurl, timeout: number): Promise<SourceResult>;
  abstract download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult>;

  protected supportsEcosystem(ecosystem: string): ecosystem is RecoverableEcosystem {
    return this.ecosystems.includes(ecosystem as RecoverableEcosystem);
  }

  protected createNotFoundResult(): SourceResult {
    return {
      source: this.name,
      status: 'not_found',
    };
  }

  protected createErrorResult(error: string): SourceResult {
    return {
      source: this.name,
      status: 'error',
      error,
    };
  }

  protected createFoundResult(
    url: string,
    options?: { archiveDate?: string; fileCount?: number }
  ): SourceResult {
    return {
      source: this.name,
      status: 'found',
      url,
      ...options,
    };
  }

  protected createPartialResult(url: string, options?: { fileCount?: number }): SourceResult {
    return {
      source: this.name,
      status: 'partial',
      url,
      ...options,
    };
  }

  // Helper to format npm package names (handles scoped packages)
  protected formatNpmPackageName(purl: ParsedPurl): string {
    if (purl.namespace) {
      const scope = purl.namespace.startsWith('@') ? purl.namespace : `@${purl.namespace}`;
      return `${scope}/${purl.name}`;
    }
    return purl.name;
  }

  // Helper to check if response is successful
  protected async checkUrl(url: string, timeout: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Helper to fetch JSON with timeout
  protected async fetchJson<T>(url: string, timeout: number): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as T;
    } catch {
      return null;
    }
  }
}
