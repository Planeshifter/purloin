import type { ParsedPurl, RegistryHandler, EcosystemType } from '../types/index.ts';

export abstract class BaseRegistry implements RegistryHandler {
  abstract readonly type: EcosystemType;
  abstract readonly baseUrl: string;

  abstract getDownloadUrl(purl: ParsedPurl): Promise<string>;
  abstract getOutputFilename(purl: ParsedPurl): string;

  protected validatePurl(purl: ParsedPurl): void {
    if (!purl.version) {
      throw new Error(`Version is required for ${this.type} packages: ${purl.raw}`);
    }
  }

  protected sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_');
  }
}
