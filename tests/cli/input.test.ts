import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readPurlsFromFile, collectPurls } from '../../src/cli/input.ts';

describe('CLI Input Handler', () => {
  const testDir = join(tmpdir(), 'purl-downloader-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('readPurlsFromFile', () => {
    it('should read PURLs from a file', async () => {
      const filePath = join(testDir, 'purls.txt');
      writeFileSync(
        filePath,
        'pkg:npm/lodash@4.17.21\npkg:pypi/requests@2.28.0\npkg:cargo/serde@1.0.193'
      );

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual([
        'pkg:npm/lodash@4.17.21',
        'pkg:pypi/requests@2.28.0',
        'pkg:cargo/serde@1.0.193',
      ]);
    });

    it('should filter out empty lines', async () => {
      const filePath = join(testDir, 'purls-with-empty.txt');
      writeFileSync(filePath, 'pkg:npm/lodash@4.17.21\n\n   \npkg:pypi/requests@2.28.0\n');

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual(['pkg:npm/lodash@4.17.21', 'pkg:pypi/requests@2.28.0']);
    });

    it('should filter out comment lines', async () => {
      const filePath = join(testDir, 'purls-with-comments.txt');
      writeFileSync(
        filePath,
        '# This is a comment\npkg:npm/lodash@4.17.21\n# Another comment\npkg:pypi/requests@2.28.0'
      );

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual(['pkg:npm/lodash@4.17.21', 'pkg:pypi/requests@2.28.0']);
    });

    it('should handle Windows line endings (CRLF)', async () => {
      const filePath = join(testDir, 'purls-crlf.txt');
      writeFileSync(filePath, 'pkg:npm/lodash@4.17.21\r\npkg:pypi/requests@2.28.0\r\n');

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual(['pkg:npm/lodash@4.17.21', 'pkg:pypi/requests@2.28.0']);
    });

    it('should return empty array for empty file', async () => {
      const filePath = join(testDir, 'empty.txt');
      writeFileSync(filePath, '');

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual([]);
    });

    it('should return empty array for file with only comments', async () => {
      const filePath = join(testDir, 'only-comments.txt');
      writeFileSync(filePath, '# Comment 1\n# Comment 2\n');

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual([]);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = join(testDir, 'nonexistent.txt');
      await expect(readPurlsFromFile(filePath)).rejects.toThrow();
    });

    it('should trim whitespace from each line', async () => {
      const filePath = join(testDir, 'purls-whitespace.txt');
      writeFileSync(filePath, '  pkg:npm/lodash@4.17.21  \n\tpkg:pypi/requests@2.28.0\t\n');

      const purls = await readPurlsFromFile(filePath);
      expect(purls).toEqual(['pkg:npm/lodash@4.17.21', 'pkg:pypi/requests@2.28.0']);
    });
  });

  describe('collectPurls', () => {
    it('should collect PURLs from CLI arguments', async () => {
      const purls = await collectPurls(['pkg:npm/lodash@4.17.21', 'pkg:pypi/requests@2.28.0'], {
        stdin: false,
      });

      expect(purls).toEqual(['pkg:npm/lodash@4.17.21', 'pkg:pypi/requests@2.28.0']);
    });

    it('should collect PURLs from file', async () => {
      const filePath = join(testDir, 'purls.txt');
      writeFileSync(filePath, 'pkg:npm/express@4.18.2\npkg:cargo/tokio@1.35.0');

      const purls = await collectPurls([], { file: filePath, stdin: false });

      expect(purls).toEqual(['pkg:npm/express@4.18.2', 'pkg:cargo/tokio@1.35.0']);
    });

    it('should combine PURLs from arguments and file', async () => {
      const filePath = join(testDir, 'purls.txt');
      writeFileSync(filePath, 'pkg:npm/express@4.18.2');

      const purls = await collectPurls(['pkg:npm/lodash@4.17.21'], {
        file: filePath,
        stdin: false,
      });

      expect(purls).toEqual(['pkg:npm/lodash@4.17.21', 'pkg:npm/express@4.18.2']);
    });

    it('should return empty array when no sources provided', async () => {
      const purls = await collectPurls([], { stdin: false });
      expect(purls).toEqual([]);
    });

    it('should handle missing file option', async () => {
      const purls = await collectPurls(['pkg:npm/lodash@4.17.21'], { stdin: false });

      expect(purls).toEqual(['pkg:npm/lodash@4.17.21']);
    });
  });
});
