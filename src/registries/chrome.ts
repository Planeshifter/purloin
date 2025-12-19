import type { ParsedPurl, EcosystemType } from '../types/index.ts';
import { BaseRegistry } from './base.ts';

/**
 * Chrome Web Store extension registry handler.
 *
 * Note: Chrome Web Store does not support downloading specific versions.
 * The version in the PURL is used for filename organization but the
 * downloaded file will always be the latest published version.
 *
 * PURL format: pkg:chrome/extension-id@version
 * Example: pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm@1.0.0
 */
export class ChromeRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'chrome';
  readonly baseUrl = 'https://clients2.google.com/service/update2/crx';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const extensionId = purl.name;

    // Validate extension ID format (32 lowercase letters)
    if (!/^[a-z]{32}$/.test(extensionId)) {
      throw new Error(
        `Invalid Chrome extension ID "${extensionId}". Must be 32 lowercase letters.`
      );
    }

    // Chrome Web Store download URL
    // prodversion=2147483647 ensures maximum compatibility
    // acceptformat=crx3 is required for modern extensions
    const params = new URLSearchParams({
      response: 'redirect',
      prodversion: '2147483647',
      x: `id=${extensionId}&uc`,
      acceptformat: 'crx3',
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    const name = this.sanitizeFilename(purl.name);
    const version = this.sanitizeFilename(purl.version);
    return `${name}-${version}.crx`;
  }
}
