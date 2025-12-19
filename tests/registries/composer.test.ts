import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ComposerRegistry } from '../../src/registries/composer.ts';
import { ParsedPurl, PurlParseError, DownloadError } from '../../src/types/index.ts';

const server = setupServer(
  // Successful package lookup
  http.get('https://repo.packagist.org/p2/monolog/monolog.json', () => {
    return HttpResponse.json({
      packages: {
        'monolog/monolog': [
          {
            name: 'monolog/monolog',
            version: '3.9.0',
            version_normalized: '3.9.0.0',
            dist: {
              type: 'zip',
              url: 'https://api.github.com/repos/Seldaek/monolog/zipball/abc123',
              reference: 'abc123',
            },
          },
          {
            name: 'monolog/monolog',
            version: '3.8.0',
            version_normalized: '3.8.0.0',
            dist: {
              type: 'zip',
              url: 'https://api.github.com/repos/Seldaek/monolog/zipball/def456',
              reference: 'def456',
            },
          },
        ],
      },
    });
  }),

  // Package with v-prefixed versions
  http.get('https://repo.packagist.org/p2/laravel/framework.json', () => {
    return HttpResponse.json({
      packages: {
        'laravel/framework': [
          {
            name: 'laravel/framework',
            version: 'v11.0.0',
            version_normalized: '11.0.0.0',
            dist: {
              type: 'zip',
              url: 'https://api.github.com/repos/laravel/framework/zipball/xyz789',
              reference: 'xyz789',
            },
          },
        ],
      },
    });
  }),

  // Package not found
  http.get('https://repo.packagist.org/p2/nonexistent/package.json', () => {
    return new HttpResponse(null, { status: 404 });
  })
);

describe('ComposerRegistry', () => {
  const registry = new ComposerRegistry();

  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('type', () => {
    it('should have type "composer"', () => {
      expect(registry.type).toBe('composer');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return correct download URL for versioned package', async () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'monolog',
        name: 'monolog',
        version: '3.9.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/monolog/monolog@3.9.0',
      };

      const url = await registry.getDownloadUrl(purl);

      expect(url).toBe('https://api.github.com/repos/Seldaek/monolog/zipball/abc123');
    });

    it('should handle v-prefixed versions', async () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'laravel',
        name: 'framework',
        version: '11.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/laravel/framework@11.0.0',
      };

      const url = await registry.getDownloadUrl(purl);

      expect(url).toBe('https://api.github.com/repos/laravel/framework/zipball/xyz789');
    });

    it('should throw error when namespace is missing', async () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: null,
        name: 'monolog',
        version: '3.9.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/monolog@3.9.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(PurlParseError);
      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/require a vendor namespace/);
    });

    it('should throw error when package not found', async () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'nonexistent',
        name: 'package',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/nonexistent/package@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(DownloadError);
      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/not found/);
    });

    it('should throw error when version not found', async () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'monolog',
        name: 'monolog',
        version: '99.99.99',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/monolog/monolog@99.99.99',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(DownloadError);
      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Version 99.99.99 not found/);
    });

    it('should throw error when version is missing', async () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'monolog',
        name: 'monolog',
        version: '',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/monolog/monolog',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Version is required/);
    });
  });

  describe('getOutputFilename', () => {
    it('should return correct filename with vendor and package', () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'monolog',
        name: 'monolog',
        version: '3.9.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/monolog/monolog@3.9.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('monolog-monolog-3.9.0.zip');
    });

    it('should handle special characters in names', () => {
      const purl: ParsedPurl = {
        type: 'composer',
        namespace: 'symfony',
        name: 'http-foundation',
        version: '7.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:composer/symfony/http-foundation@7.0.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('symfony-http-foundation-7.0.0.zip');
    });
  });
});
