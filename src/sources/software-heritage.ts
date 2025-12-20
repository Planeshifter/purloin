import { BaseSource } from './base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../types/index.ts';

interface SwhOriginResponse {
  url: string;
  origin_visits_url: string;
}

interface SwhVisit {
  date: string;
  snapshot: string;
  status: string;
}

export class SoftwareHeritageSource extends BaseSource {
  readonly name = 'software-heritage';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['npm', 'pypi', 'gem'];

  private readonly apiBase = 'https://archive.softwareheritage.org/api/1';

  private getOriginUrl(purl: ParsedPurl): string | null {
    switch (purl.type) {
      case 'npm': {
        const packageName = this.formatNpmPackageName(purl);
        return `https://www.npmjs.com/package/${packageName}`;
      }
      case 'pypi':
        return `https://pypi.org/project/${purl.name}/`;
      case 'gem':
        return `https://rubygems.org/gems/${purl.name}`;
      default:
        return null;
    }
  }

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    const originUrl = this.getOriginUrl(purl);
    if (!originUrl) {
      return this.createNotFoundResult();
    }

    try {
      // Search for the origin in Software Heritage
      const encodedUrl = encodeURIComponent(originUrl);
      const searchUrl = `${this.apiBase}/origin/${encodedUrl}/get/`;

      const origin = await this.fetchJson<SwhOriginResponse>(searchUrl, timeout);

      if (!origin) {
        return this.createNotFoundResult();
      }

      // Get visits to find the archive date
      const visitsUrl = `${this.apiBase}/origin/${encodedUrl}/visits/`;
      const visits = await this.fetchJson<SwhVisit[]>(visitsUrl, timeout);

      if (visits && visits.length > 0) {
        // Find the most recent successful visit
        const successfulVisit = visits.find((v) => v.status === 'full' || v.status === 'partial');
        const archiveDate = successfulVisit?.date?.split('T')[0];

        return this.createFoundResult(
          `https://archive.softwareheritage.org/browse/origin/?origin_url=${encodedUrl}`,
          { archiveDate }
        );
      }

      return this.createFoundResult(
        `https://archive.softwareheritage.org/browse/origin/?origin_url=${encodedUrl}`
      );
    } catch (error) {
      return this.createErrorResult((error as Error).message);
    }
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    // Software Heritage archives source code, not tarballs
    // Recovery would require reconstructing from the archived source tree
    // For now, we report metadata_only with the archive location
    const probeResult = await this.probe(purl, timeout);

    if (probeResult.status === 'found') {
      return {
        ...probeResult,
        status: 'metadata_only',
      };
    }

    return probeResult;
  }
}
