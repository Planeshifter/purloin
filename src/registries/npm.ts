import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';

export class NpmRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'npm';
  readonly baseUrl = 'https://registry.npmjs.org';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { namespace, name, version } = purl;

    // Handle scoped packages: @scope/package
    if (namespace) {
      // Strip leading @ if present (some PURLs include it, spec says not to)
      const scope = namespace.startsWith('@') ? namespace.slice(1) : namespace;
      // URL: /@scope/package/-/package-version.tgz
      return `${this.baseUrl}/@${scope}/${name}/-/${name}-${version}.tgz`;
    }

    // Unscoped package: /package/-/package-version.tgz
    return `${this.baseUrl}/${name}/-/${name}-${version}.tgz`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    const { namespace, name, version } = purl;
    if (namespace) {
      const scope = namespace.startsWith('@') ? namespace.slice(1) : namespace;
      return this.sanitizeFilename(`${scope}-${name}-${version}.tgz`);
    }
    return `${name}-${version}.tgz`;
  }
}
