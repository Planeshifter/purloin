import { BaseSource } from './base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../types/index.ts';

interface WaybackResponse {
  archived_snapshots: {
    closest?: {
      available: boolean;
      url: string;
      timestamp: string;
      status: string;
    };
  };
}

export class WaybackSource extends BaseSource {
  readonly name = 'wayback';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['npm', 'pypi', 'gem'];

  private readonly apiBase = 'https://archive.org/wayback/available';

  private getRegistryUrl(purl: ParsedPurl): string | null {
    switch (purl.type) {
      case 'npm': {
        const packageName = this.formatNpmPackageName(purl);
        return `https://www.npmjs.com/package/${packageName}/v/${purl.version}`;
      }
      case 'pypi':
        return `https://pypi.org/project/${purl.name}/${purl.version}/`;
      case 'gem':
        return `https://rubygems.org/gems/${purl.name}/versions/${purl.version}`;
      default:
        return null;
    }
  }

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    const registryUrl = this.getRegistryUrl(purl);
    if (!registryUrl) {
      return this.createNotFoundResult();
    }

    try {
      const apiUrl = `${this.apiBase}?url=${encodeURIComponent(registryUrl)}`;
      const data = await this.fetchJson<WaybackResponse>(apiUrl, timeout);

      if (!data?.archived_snapshots?.closest?.available) {
        return this.createNotFoundResult();
      }

      const snapshot = data.archived_snapshots.closest;
      // Convert timestamp (YYYYMMDDHHmmss) to date string
      const ts = snapshot.timestamp;
      const archiveDate = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;

      return {
        source: this.name,
        status: 'metadata_only',
        url: snapshot.url,
        archiveDate,
      };
    } catch (error) {
      return this.createErrorResult((error as Error).message);
    }
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    // Wayback Machine archives web pages, not package tarballs
    // We can only provide the archived registry page as metadata
    return this.probe(purl, timeout);
  }
}
