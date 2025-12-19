import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { PypiRegistry } from '../../src/registries/pypi.ts';
import { ParsedPurl, DownloadError } from '../../src/types/index.ts';

const server = setupServer(
  http.get('https://pypi.org/pypi/:pkg/:version/json', ({ params }) => {
    const pkg = params.pkg as string;
    const version = params.version as string;

    if (pkg === 'nonexistent') {
      return new HttpResponse(null, { status: 404 });
    }

    if (pkg === 'wheel-only') {
      return HttpResponse.json({
        urls: [
          {
            packagetype: 'bdist_wheel',
            url: `https://files.pythonhosted.org/packages/wheel/${pkg}-${version}.whl`,
            filename: `${pkg}-${version}.whl`,
          },
        ],
      });
    }

    if (pkg === 'no-files') {
      return HttpResponse.json({ urls: [] });
    }

    return HttpResponse.json({
      urls: [
        {
          packagetype: 'sdist',
          url: `https://files.pythonhosted.org/packages/source/${pkg}-${version}.tar.gz`,
          filename: `${pkg}-${version}.tar.gz`,
        },
        {
          packagetype: 'bdist_wheel',
          url: `https://files.pythonhosted.org/packages/wheel/${pkg}-${version}.whl`,
          filename: `${pkg}-${version}.whl`,
        },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('PypiRegistry', () => {
  const registry = new PypiRegistry();

  describe('type', () => {
    it('should have type "pypi"', () => {
      expect(registry.type).toBe('pypi');
    });
  });

  describe('baseUrl', () => {
    it('should use pypi.org', () => {
      expect(registry.baseUrl).toBe('https://pypi.org/pypi');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return sdist URL when available', async () => {
      const purl: ParsedPurl = {
        type: 'pypi',
        namespace: null,
        name: 'requests',
        version: '2.28.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:pypi/requests@2.28.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://files.pythonhosted.org/packages/source/requests-2.28.0.tar.gz');
    });

    it('should fall back to wheel when no sdist available', async () => {
      const purl: ParsedPurl = {
        type: 'pypi',
        namespace: null,
        name: 'wheel-only',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:pypi/wheel-only@1.0.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://files.pythonhosted.org/packages/wheel/wheel-only-1.0.0.whl');
    });

    it('should throw DownloadError when package not found', async () => {
      const purl: ParsedPurl = {
        type: 'pypi',
        namespace: null,
        name: 'nonexistent',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:pypi/nonexistent@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(DownloadError);
    });

    it('should throw DownloadError when no files available', async () => {
      const purl: ParsedPurl = {
        type: 'pypi',
        namespace: null,
        name: 'no-files',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:pypi/no-files@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/No downloadable file found/);
    });
  });

  describe('getOutputFilename', () => {
    it('should generate correct filename', () => {
      const purl: ParsedPurl = {
        type: 'pypi',
        namespace: null,
        name: 'requests',
        version: '2.28.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:pypi/requests@2.28.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('requests-2.28.0.tar.gz');
    });
  });
});
