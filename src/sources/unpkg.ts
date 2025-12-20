import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { BaseSource } from './base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../types/index.ts';

export class UnpkgSource extends BaseSource {
  readonly name = 'unpkg';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['npm'];

  private readonly baseUrl = 'https://unpkg.com';

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'npm') {
      return this.createNotFoundResult();
    }

    const packageName = this.formatNpmPackageName(purl);
    // Check if package.json exists as a proxy for package availability
    const packageJsonUrl = `${this.baseUrl}/${packageName}@${purl.version}/package.json`;

    const exists = await this.checkUrl(packageJsonUrl, timeout);

    if (exists) {
      return this.createFoundResult(`${this.baseUrl}/${packageName}@${purl.version}/`);
    }

    return this.createNotFoundResult();
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'npm') {
      return this.createNotFoundResult();
    }

    const packageName = this.formatNpmPackageName(purl);
    const packageJsonUrl = `${this.baseUrl}/${packageName}@${purl.version}/package.json`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(packageJsonUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        return this.createNotFoundResult();
      }

      // unpkg doesn't serve tarballs, only individual files
      // Download package.json as proof of availability
      await mkdir(dirname(outputPath), { recursive: true });
      const manifestPath = outputPath.replace(/\.tgz$/, '-unpkg-manifest.json');
      const fileStream = createWriteStream(manifestPath);
      await pipeline(Readable.fromWeb(response.body as never), fileStream);

      return this.createPartialResult(`${this.baseUrl}/${packageName}@${purl.version}/`);
    } catch (error) {
      return this.createErrorResult((error as Error).message);
    }
  }
}
