import { BaseSource } from './base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../types/index.ts';

export class EsmShSource extends BaseSource {
  readonly name = 'esm.sh';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['npm'];

  private readonly baseUrl = 'https://esm.sh';

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'npm') {
      return this.createNotFoundResult();
    }

    const packageName = this.formatNpmPackageName(purl);
    // esm.sh serves ES modules, check if the package is available
    const moduleUrl = `${this.baseUrl}/${packageName}@${purl.version}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(moduleUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return this.createFoundResult(moduleUrl);
      }

      return this.createNotFoundResult();
    } catch {
      return this.createNotFoundResult();
    }
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    // esm.sh only serves ES modules, not tarballs
    // We can only confirm the package exists
    const probeResult = await this.probe(purl, timeout);

    if (probeResult.status === 'found') {
      return {
        ...probeResult,
        status: 'metadata_only',
      };
    }

    return probeResult;
  }
}
