import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';

export class RubygemsRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'gem';
  readonly baseUrl = 'https://rubygems.org';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { name, version } = purl;

    // URL: /gems/rails-7.0.0.gem
    return `${this.baseUrl}/gems/${name}-${version}.gem`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    return `${purl.name}-${purl.version}.gem`;
  }
}
