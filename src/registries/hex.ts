import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';

export class HexRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'hex';
  readonly baseUrl = 'https://repo.hex.pm';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { name, version } = purl;

    // URL: /tarballs/phoenix-1.6.0.tar
    return `${this.baseUrl}/tarballs/${name}-${version}.tar`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    return `${purl.name}-${purl.version}.tar`;
  }
}
