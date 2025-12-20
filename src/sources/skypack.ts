import { BaseSource } from './base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../types/index.ts';

export class SkypackSource extends BaseSource {
  readonly name = 'skypack';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['npm'];

  private readonly baseUrl = 'https://cdn.skypack.dev';

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'npm') {
      return this.createNotFoundResult();
    }

    const packageName = this.formatNpmPackageName(purl);
    // Skypack serves ES modules, check if the package is available
    const moduleUrl = `${this.baseUrl}/${packageName}@${purl.version}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Skypack returns a redirect to the actual module, so we check for that
      const response = await fetch(moduleUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual', // Don't follow redirects, we just want to know if it exists
      });

      clearTimeout(timeoutId);

      // Skypack returns 302 redirects for valid packages
      if (response.ok || response.status === 302) {
        return this.createFoundResult(moduleUrl);
      }

      return this.createNotFoundResult();
    } catch {
      return this.createNotFoundResult();
    }
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    // Skypack only serves ES modules, not tarballs
    // We can only confirm the package exists, not download the original tarball
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
