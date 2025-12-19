import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';

export class CargoRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'cargo';
  readonly baseUrl = 'https://static.crates.io';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { name, version } = purl;

    // URL: /crates/serde/serde-1.0.0.crate
    return `${this.baseUrl}/crates/${name}/${name}-${version}.crate`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    return `${purl.name}-${purl.version}.crate`;
  }
}
