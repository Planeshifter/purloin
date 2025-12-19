import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';
import { PurlParseError } from '../types/index.ts';

const OPENVSX_HOST = 'open-vsx.org';

/**
 * VS Code extension registry handler.
 *
 * Supports both VS Code Marketplace and Open VSX registry.
 * The registry is determined by the repository_url qualifier:
 * - https://open-vsx.org → Open VSX
 * - Default (no qualifier) → VS Code Marketplace
 *
 * PURL format: pkg:vscode/publisher/extension@version?platform=...&repository_url=...
 * Examples:
 *   pkg:vscode/ms-python/python@2024.0.1
 *   pkg:vscode/redhat/vscode-yaml@1.14.0?repository_url=https://open-vsx.org
 *   pkg:vscode/ms-vscode/cpptools@1.18.0?platform=linux-x64
 */
export class VscodeRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'vscode';

  private isOpenVsx(purl: ParsedPurl): boolean {
    const repoUrl = purl.qualifiers?.repository_url;
    if (!repoUrl) return false;
    try {
      const url = new URL(repoUrl);
      return url.host === OPENVSX_HOST;
    } catch {
      return repoUrl.includes(OPENVSX_HOST);
    }
  }

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { namespace, name, version, qualifiers } = purl;

    if (!namespace) {
      throw new PurlParseError(purl.raw, 'VS Code extensions require a publisher (namespace)');
    }

    const platform = qualifiers?.platform;

    if (this.isOpenVsx(purl)) {
      return this.getOpenVsxUrl(namespace, name, version, platform);
    } else {
      return this.getMarketplaceUrl(namespace, name, version, platform);
    }
  }

  private getOpenVsxUrl(
    publisher: string,
    extension: string,
    version: string,
    platform?: string
  ): string {
    // Open VSX URL format:
    // /api/{publisher}/{extension}/{version}/file/{publisher}.{extension}-{version}.vsix
    // With platform: ...@{platform}.vsix
    const baseUrl = 'https://open-vsx.org/api';
    const filename = platform
      ? `${publisher}.${extension}-${version}@${platform}.vsix`
      : `${publisher}.${extension}-${version}.vsix`;
    return `${baseUrl}/${publisher}/${extension}/${version}/file/${filename}`;
  }

  private getMarketplaceUrl(
    publisher: string,
    extension: string,
    version: string,
    platform?: string
  ): string {
    // VS Code Marketplace URL format:
    // /_apis/public/gallery/publishers/{publisher}/vsextensions/{extension}/{version}/vspackage
    // With platform: ?targetPlatform={platform}
    const baseUrl = 'https://marketplace.visualstudio.com/_apis/public/gallery/publishers';
    let url = `${baseUrl}/${publisher}/vsextensions/${extension}/${version}/vspackage`;
    if (platform) {
      url += `?targetPlatform=${platform}`;
    }
    return url;
  }

  getOutputFilename(purl: ParsedPurl): string {
    const { namespace, name, version, qualifiers } = purl;
    const platform = qualifiers?.platform;
    // Format: publisher.extension-version[@platform].vsix
    if (platform) {
      return `${namespace}.${name}-${version}@${platform}.vsix`;
    }
    return `${namespace}.${name}-${version}.vsix`;
  }
}
