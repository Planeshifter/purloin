import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fetchWithRetry } from '../../src/downloader/fetcher.ts';
import { DownloadError, NetworkError } from '../../src/types/index.ts';

const testDir = join(tmpdir(), 'purl-fetcher-test-' + Date.now());

const server = setupServer(
  http.get('https://test.example.com/success', () => {
    return new HttpResponse(
      new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]), // "Hello"
      { headers: { 'Content-Type': 'application/octet-stream' } }
    );
  }),

  http.get('https://test.example.com/not-found', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('https://test.example.com/server-error', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get('https://test.example.com/retry-then-succeed', ({ request }) => {
    const url = new URL(request.url);
    const attempt = parseInt(url.searchParams.get('attempt') || '1');

    // Fail first 2 attempts, succeed on 3rd
    if (attempt < 3) {
      return new HttpResponse(null, { status: 503 });
    }
    return new HttpResponse(
      new Uint8Array([0x4f, 0x4b]), // "OK"
      { headers: { 'Content-Type': 'application/octet-stream' } }
    );
  }),

  http.get('https://test.example.com/slow', async () => {
    await delay(5000); // 5 second delay
    return new HttpResponse(new Uint8Array([0x4f, 0x4b]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  http.get('https://test.example.com/large', () => {
    // 1KB of data
    const data = new Uint8Array(1024).fill(0x41);
    return new HttpResponse(data, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  rmSync(testDir, { recursive: true, force: true });
});

describe('Fetcher', () => {
  describe('fetchWithRetry', () => {
    it('should download file successfully', async () => {
      const outputPath = join(testDir, 'success.bin');

      const bytes = await fetchWithRetry('https://test.example.com/success', outputPath, {
        timeout: 5000,
        retries: 0,
      });

      expect(bytes).toBe(5);
      expect(existsSync(outputPath)).toBe(true);
      expect(readFileSync(outputPath).toString()).toBe('Hello');
    });

    it('should throw DownloadError on 404', async () => {
      const outputPath = join(testDir, 'not-found.bin');

      await expect(
        fetchWithRetry('https://test.example.com/not-found', outputPath, {
          timeout: 5000,
          retries: 0,
        })
      ).rejects.toThrow(DownloadError);
    });

    it('should not retry on 4xx errors', async () => {
      const outputPath = join(testDir, 'not-found-no-retry.bin');

      await expect(
        fetchWithRetry('https://test.example.com/not-found', outputPath, {
          timeout: 5000,
          retries: 3,
        })
      ).rejects.toThrow(DownloadError);
    });

    it('should create parent directories if they do not exist', async () => {
      const outputPath = join(testDir, 'nested', 'dir', 'success.bin');

      await fetchWithRetry('https://test.example.com/success', outputPath, {
        timeout: 5000,
        retries: 0,
      });

      expect(existsSync(outputPath)).toBe(true);
    });

    it('should handle large files', async () => {
      const outputPath = join(testDir, 'large.bin');

      const bytes = await fetchWithRetry('https://test.example.com/large', outputPath, {
        timeout: 5000,
        retries: 0,
      });

      expect(bytes).toBe(1024);
      expect(existsSync(outputPath)).toBe(true);
      expect(readFileSync(outputPath).length).toBe(1024);
    });

    it('should timeout on slow responses', async () => {
      const outputPath = join(testDir, 'timeout.bin');

      await expect(
        fetchWithRetry(
          'https://test.example.com/slow',
          outputPath,
          { timeout: 100, retries: 0 } // 100ms timeout
        )
      ).rejects.toThrow(NetworkError);
    }, 10000);
  });
});
