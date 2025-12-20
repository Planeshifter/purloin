import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { BaseSource } from './base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../types/index.ts';

interface JsdelivrFilesResponse {
  files: Array<{
    name: string;
    hash: string;
    size: number;
  }>;
}

export class JsdelivrSource extends BaseSource {
  readonly name = 'jsdelivr';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['npm'];

  private readonly apiBase = 'https://data.jsdelivr.com/v1';
  private readonly cdnBase = 'https://cdn.jsdelivr.net';

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'npm') {
      return this.createNotFoundResult();
    }

    const packageName = this.formatNpmPackageName(purl);
    const apiUrl = `${this.apiBase}/package/npm/${packageName}@${purl.version}`;

    try {
      const data = await this.fetchJson<JsdelivrFilesResponse>(apiUrl, timeout);

      if (!data || !data.files) {
        return this.createNotFoundResult();
      }

      return this.createFoundResult(`${this.cdnBase}/npm/${packageName}@${purl.version}/`, {
        fileCount: data.files.length,
      });
    } catch (error) {
      return this.createErrorResult((error as Error).message);
    }
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'npm') {
      return this.createNotFoundResult();
    }

    const packageName = this.formatNpmPackageName(purl);

    // jsdelivr doesn't serve tarballs directly, but we can reconstruct from individual files
    // For now, we'll check if the package exists and report partial recovery
    // A full implementation would download all files and create a tarball

    const apiUrl = `${this.apiBase}/package/npm/${packageName}@${purl.version}`;

    try {
      const data = await this.fetchJson<JsdelivrFilesResponse>(apiUrl, timeout);

      if (!data || !data.files) {
        return this.createNotFoundResult();
      }

      // Download the tarball if available via a special endpoint
      // jsdelivr provides /+esm for ES modules but not tarballs
      // We'll try to download individual files and note this is partial recovery

      // For now, create a manifest of what could be recovered
      await mkdir(dirname(outputPath), { recursive: true });

      // Try to download package.json as a proof of concept
      const packageJsonUrl = `${this.cdnBase}/npm/${packageName}@${purl.version}/package.json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(packageJsonUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok && response.body) {
        const manifestPath = outputPath.replace(/\.tgz$/, '-jsdelivr-manifest.json');
        const fileStream = createWriteStream(manifestPath);
        await pipeline(Readable.fromWeb(response.body as never), fileStream);

        return this.createPartialResult(`${this.cdnBase}/npm/${packageName}@${purl.version}/`, {
          fileCount: data.files.length,
        });
      }

      return this.createNotFoundResult();
    } catch (error) {
      return this.createErrorResult((error as Error).message);
    }
  }
}
