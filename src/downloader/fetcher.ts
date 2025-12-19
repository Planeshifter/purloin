import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import pRetry, { AbortError } from 'p-retry';
import { DownloadError, NetworkError } from '../types/index.ts';

export interface FetchOptions {
  timeout: number;
  retries: number;
}

async function streamToFile(body: ReadableStream<Uint8Array>, outputPath: string): Promise<number> {
  // Ensure directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  const writeStream = createWriteStream(outputPath);
  const nodeReadable = Readable.fromWeb(body as import('stream/web').ReadableStream);

  let bytesWritten = 0;
  nodeReadable.on('data', (chunk: Buffer) => {
    bytesWritten += chunk.length;
  });

  await pipeline(nodeReadable, writeStream);

  return bytesWritten;
}

export async function fetchWithRetry(
  url: string,
  outputPath: string,
  options: FetchOptions
): Promise<number> {
  const { timeout, retries } = options;

  return pRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          // Don't retry 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw new AbortError(
              new DownloadError('', url, response.status, `HTTP ${response.status}`)
            );
          }
          throw new DownloadError('', url, response.status, `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new DownloadError('', url, undefined, 'No response body');
        }

        // Stream to file
        const bytesWritten = await streamToFile(response.body, outputPath);
        return bytesWritten;
      } catch (error) {
        if (error instanceof AbortError) {
          throw error;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new NetworkError(url, new Error('Request timeout'));
        }
        if (error instanceof DownloadError || error instanceof NetworkError) {
          throw error;
        }
        throw new NetworkError(url, error as Error);
      } finally {
        clearTimeout(timeoutId);
      }
    },
    {
      retries,
      onFailedAttempt: (error) => {
        if (error.retriesLeft > 0) {
          console.log(
            `  Attempt ${error.attemptNumber} failed for ${url}. ${error.retriesLeft} retries left.`
          );
        }
      },
    }
  );
}
