import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { BaseSource } from '../base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../../types/index.ts';

interface PypiMirror {
  name: string;
  baseUrl: string;
}

const PYPI_MIRRORS: PypiMirror[] = [
  { name: 'aliyun', baseUrl: 'https://mirrors.aliyun.com/pypi' },
  { name: 'tsinghua', baseUrl: 'https://pypi.tuna.tsinghua.edu.cn' },
  { name: 'nju', baseUrl: 'https://mirror.nju.edu.cn/pypi/web' },
];

export class PypiMirrorsSource extends BaseSource {
  readonly name = 'pypi-mirrors';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['pypi'];

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'pypi') {
      return this.createNotFoundResult();
    }

    // Try each mirror until we find one that has the package
    for (const mirror of PYPI_MIRRORS) {
      const tarballUrl = await this.findTarballUrl(mirror.baseUrl, purl, timeout);
      if (tarballUrl) {
        return this.createFoundResult(tarballUrl);
      }
    }

    return this.createNotFoundResult();
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'pypi') {
      return this.createNotFoundResult();
    }

    // Try each mirror until we can download the package
    for (const mirror of PYPI_MIRRORS) {
      const tarballUrl = await this.findTarballUrl(mirror.baseUrl, purl, timeout);
      if (!tarballUrl) continue;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(tarballUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok && response.body) {
          await mkdir(dirname(outputPath), { recursive: true });
          const fileStream = createWriteStream(outputPath);
          await pipeline(Readable.fromWeb(response.body as never), fileStream);

          return this.createFoundResult(tarballUrl);
        }
      } catch {
        // Try next mirror
        continue;
      }
    }

    return this.createNotFoundResult();
  }

  private async findTarballUrl(
    baseUrl: string,
    purl: ParsedPurl,
    timeout: number
  ): Promise<string | null> {
    // Normalize package name for PyPI (lowercase, replace - and . with -)
    const normalizedName = purl.name.toLowerCase().replace(/[_.]/g, '-');
    const simpleUrl = `${baseUrl}/simple/${normalizedName}/`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(simpleUrl, {
        signal: controller.signal,
        headers: { Accept: 'text/html' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const html = await response.text();

      // Look for tarball link matching the version
      // Format: href="../../packages/.../package-version.tar.gz#sha256=..."
      const tarballPattern = new RegExp(
        `href="([^"]*/${purl.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${purl.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.tar\\.gz)[^"]*"`,
        'i'
      );
      const match = html.match(tarballPattern);

      if (match) {
        const href = match[1];
        // Handle relative URLs
        if (href.startsWith('../../')) {
          return `${baseUrl}/${href.slice(6).split('#')[0]}`;
        }
        if (href.startsWith('/')) {
          const url = new URL(baseUrl);
          return `${url.origin}${href.split('#')[0]}`;
        }
        return href.split('#')[0];
      }

      return null;
    } catch {
      return null;
    }
  }
}
