import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';

export class NugetRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'nuget';
  readonly baseUrl = 'https://api.nuget.org/v3-flatcontainer';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { name, version } = purl;

    // NuGet uses lowercase for URLs
    const idLower = name.toLowerCase();
    const versionLower = version.toLowerCase();

    // URL: /newtonsoft.json/13.0.1/newtonsoft.json.13.0.1.nupkg
    return `${this.baseUrl}/${idLower}/${versionLower}/${idLower}.${versionLower}.nupkg`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    const { name, version } = purl;
    return `${name.toLowerCase()}.${version.toLowerCase()}.nupkg`;
  }
}
