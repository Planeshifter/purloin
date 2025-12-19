import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';

export class GolangRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'golang';
  readonly baseUrl = 'https://proxy.golang.org';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { namespace, name, version } = purl;

    // Go modules: namespace is the domain, name is the path
    // e.g., pkg:golang/github.com/gorilla/mux@v1.8.0
    // Module path: github.com/gorilla/mux
    const modulePath = namespace ? `${namespace}/${name}` : name;

    // Version must have 'v' prefix for Go modules
    const versionStr = version.startsWith('v') ? version : `v${version}`;

    // URL encode the module path (capital letters become !lowercase)
    const encodedPath = this.encodeModulePath(modulePath);

    // URL: /github.com/gorilla/mux/@v/v1.8.0.zip
    return `${this.baseUrl}/${encodedPath}/@v/${versionStr}.zip`;
  }

  private encodeModulePath(path: string): string {
    // Go module path encoding: uppercase -> !lowercase
    return path.replace(/[A-Z]/g, (char) => '!' + char.toLowerCase());
  }

  getOutputFilename(purl: ParsedPurl): string {
    const { namespace, name, version } = purl;
    const safeName = namespace
      ? `${namespace}-${name}`.replace(/\//g, '-')
      : name.replace(/\//g, '-');
    const versionStr = version.startsWith('v') ? version : `v${version}`;
    return this.sanitizeFilename(`${safeName}-${versionStr}.zip`);
  }
}
