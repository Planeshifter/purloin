import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';
import { DownloadError } from '../types/index.ts';

interface PypiFile {
  packagetype: string;
  url: string;
  filename: string;
}

interface PypiResponse {
  urls: PypiFile[];
}

export class PypiRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'pypi';
  readonly baseUrl = 'https://pypi.org/pypi';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { name, version } = purl;

    // Query PyPI JSON API to get download URL
    const apiUrl = `${this.baseUrl}/${name}/${version}/json`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new DownloadError(
        purl.raw,
        apiUrl,
        response.status,
        `PyPI API error for ${name}@${version}`
      );
    }

    const data = (await response.json()) as PypiResponse;

    // Find sdist (source distribution) in urls
    const sdist = data.urls?.find((file: PypiFile) => file.packagetype === 'sdist');

    if (sdist) {
      return sdist.url;
    }

    // Fallback to wheel if no sdist
    const wheel = data.urls?.find((file: PypiFile) => file.packagetype === 'bdist_wheel');

    if (wheel) {
      return wheel.url;
    }

    throw new DownloadError(
      purl.raw,
      apiUrl,
      undefined,
      `No downloadable file found for ${name}@${version}`
    );
  }

  getOutputFilename(purl: ParsedPurl): string {
    const { name, version } = purl;
    return `${name}-${version}.tar.gz`;
  }
}
