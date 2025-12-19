import type { ParsedPurl, EcosystemType } from '../types/index.ts';
import { PurlParseError, DownloadError } from '../types/index.ts';
import { BaseRegistry } from './base.ts';

/**
 * Composer/Packagist registry handler for PHP packages.
 *
 * PURL format: pkg:composer/vendor/package@version
 * Example: pkg:composer/monolog/monolog@3.9.0
 */
export class ComposerRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'composer';
  readonly baseUrl = 'https://repo.packagist.org';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { namespace, name, version } = purl;

    if (!namespace) {
      throw new PurlParseError(
        purl.raw,
        'Composer packages require a vendor namespace (e.g., pkg:composer/vendor/package@version)'
      );
    }

    // Fetch package metadata from Packagist
    const metadataUrl = `${this.baseUrl}/p2/${namespace}/${name}.json`;

    try {
      const response = await fetch(metadataUrl);

      if (!response.ok) {
        throw new DownloadError(
          purl.raw,
          metadataUrl,
          response.status,
          `Package not found: ${namespace}/${name}`
        );
      }

      const data = (await response.json()) as PackagistResponse;
      const packageKey = `${namespace}/${name}`;
      const versions = data.packages[packageKey];

      if (!versions || versions.length === 0) {
        throw new DownloadError(
          purl.raw,
          metadataUrl,
          undefined,
          `No versions found for package ${packageKey}`
        );
      }

      // Find the specific version
      // Composer versions can have 'v' prefix, so try both
      const versionEntry = versions.find(
        (v) =>
          v.version === version || v.version === `v${version}` || v.version_normalized === version
      );

      if (!versionEntry) {
        const availableVersions = versions
          .slice(0, 5)
          .map((v) => v.version)
          .join(', ');
        throw new DownloadError(
          purl.raw,
          metadataUrl,
          undefined,
          `Version ${version} not found. Available versions include: ${availableVersions}...`
        );
      }

      if (!versionEntry.dist?.url) {
        throw new DownloadError(
          purl.raw,
          metadataUrl,
          undefined,
          `No distribution URL found for version ${version}`
        );
      }

      return versionEntry.dist.url;
    } catch (error) {
      if (error instanceof DownloadError || error instanceof PurlParseError) {
        throw error;
      }
      throw new DownloadError(
        purl.raw,
        metadataUrl,
        undefined,
        `Failed to fetch package metadata: ${(error as Error).message}`
      );
    }
  }

  getOutputFilename(purl: ParsedPurl): string {
    const vendor = this.sanitizeFilename(purl.namespace || '');
    const name = this.sanitizeFilename(purl.name);
    const version = this.sanitizeFilename(purl.version);
    return `${vendor}-${name}-${version}.zip`;
  }
}

// Packagist API response types
interface PackagistResponse {
  packages: {
    [key: string]: PackagistVersion[];
  };
}

interface PackagistVersion {
  name: string;
  version: string;
  version_normalized?: string;
  dist?: {
    type: string;
    url: string;
    reference: string;
    shasum?: string;
  };
}
