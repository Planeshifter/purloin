import { describe, it, expect } from 'vitest';
import { GolangRegistry } from '../../src/registries/golang.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('GolangRegistry', () => {
  const registry = new GolangRegistry();

  describe('type', () => {
    it('should have type "golang"', () => {
      expect(registry.type).toBe('golang');
    });
  });

  describe('baseUrl', () => {
    it('should use proxy.golang.org', () => {
      expect(registry.baseUrl).toBe('https://proxy.golang.org');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct URL with v prefix', async () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: 'github.com/gorilla',
        name: 'mux',
        version: 'v1.8.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/github.com/gorilla/mux@v1.8.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://proxy.golang.org/github.com/gorilla/mux/@v/v1.8.0.zip');
    });

    it('should add v prefix if missing', async () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: 'github.com/gorilla',
        name: 'mux',
        version: '1.8.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/github.com/gorilla/mux@1.8.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://proxy.golang.org/github.com/gorilla/mux/@v/v1.8.0.zip');
    });

    it('should encode uppercase letters in module path', async () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: 'github.com/Azure',
        name: 'azure-sdk-for-go',
        version: 'v68.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/github.com/Azure/azure-sdk-for-go@v68.0.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://proxy.golang.org/github.com/!azure/azure-sdk-for-go/@v/v68.0.0.zip'
      );
    });

    it('should handle golang.org/x modules', async () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: 'golang.org/x',
        name: 'text',
        version: 'v0.14.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/golang.org/x/text@v0.14.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://proxy.golang.org/golang.org/x/text/@v/v0.14.0.zip');
    });

    it('should handle modules without namespace', async () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: null,
        name: 'rsc.io/quote',
        version: 'v1.5.2',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/rsc.io/quote@v1.5.2',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://proxy.golang.org/rsc.io/quote/@v/v1.5.2.zip');
    });
  });

  describe('getOutputFilename', () => {
    it('should generate safe filename with dashes', () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: 'github.com/gorilla',
        name: 'mux',
        version: 'v1.8.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/github.com/gorilla/mux@v1.8.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('github.com-gorilla-mux-v1.8.0.zip');
    });

    it('should add v prefix to version in filename', () => {
      const purl: ParsedPurl = {
        type: 'golang',
        namespace: 'github.com/gorilla',
        name: 'mux',
        version: '1.8.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:golang/github.com/gorilla/mux@1.8.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('github.com-gorilla-mux-v1.8.0.zip');
    });
  });
});
