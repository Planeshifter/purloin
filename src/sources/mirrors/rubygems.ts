import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { BaseSource } from '../base.ts';
import type { ParsedPurl, SourceResult, RecoverableEcosystem } from '../../types/index.ts';

interface RubygemsMirror {
  name: string;
  baseUrl: string;
}

const RUBYGEMS_MIRRORS: RubygemsMirror[] = [
  { name: 'ruby-china', baseUrl: 'https://gems.ruby-china.com' },
  { name: 'tsinghua', baseUrl: 'https://mirrors.tuna.tsinghua.edu.cn/rubygems' },
];

export class RubygemsMirrorsSource extends BaseSource {
  readonly name = 'rubygems-mirrors';
  readonly ecosystems: readonly RecoverableEcosystem[] = ['gem'];

  async probe(purl: ParsedPurl, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'gem') {
      return this.createNotFoundResult();
    }

    // Try each mirror until we find one that has the package
    for (const mirror of RUBYGEMS_MIRRORS) {
      const gemUrl = this.getGemUrl(mirror.baseUrl, purl);

      try {
        const exists = await this.checkUrl(gemUrl, timeout);
        if (exists) {
          return this.createFoundResult(gemUrl);
        }
      } catch {
        // Try next mirror
        continue;
      }
    }

    return this.createNotFoundResult();
  }

  async download(purl: ParsedPurl, outputPath: string, timeout: number): Promise<SourceResult> {
    if (purl.type !== 'gem') {
      return this.createNotFoundResult();
    }

    // Try each mirror until we can download the gem
    for (const mirror of RUBYGEMS_MIRRORS) {
      const gemUrl = this.getGemUrl(mirror.baseUrl, purl);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(gemUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok && response.body) {
          await mkdir(dirname(outputPath), { recursive: true });
          const fileStream = createWriteStream(outputPath);
          await pipeline(Readable.fromWeb(response.body as never), fileStream);

          return this.createFoundResult(gemUrl);
        }
      } catch {
        // Try next mirror
        continue;
      }
    }

    return this.createNotFoundResult();
  }

  private getGemUrl(baseUrl: string, purl: ParsedPurl): string {
    // RubyGems gem naming: gemname-version.gem
    return `${baseUrl}/gems/${purl.name}-${purl.version}.gem`;
  }
}
