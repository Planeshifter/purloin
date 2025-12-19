import { describe, it, expect } from 'vitest';
import { RubygemsRegistry } from '../../src/registries/rubygems.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('RubygemsRegistry', () => {
  const registry = new RubygemsRegistry();

  describe('type', () => {
    it('should have type "gem"', () => {
      expect(registry.type).toBe('gem');
    });
  });

  describe('baseUrl', () => {
    it('should use rubygems.org', () => {
      expect(registry.baseUrl).toBe('https://rubygems.org');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct URL', async () => {
      const purl: ParsedPurl = {
        type: 'gem',
        namespace: null,
        name: 'rails',
        version: '7.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:gem/rails@7.0.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://rubygems.org/gems/rails-7.0.0.gem');
    });

    it('should handle gems with hyphens in name', async () => {
      const purl: ParsedPurl = {
        type: 'gem',
        namespace: null,
        name: 'rack-cors',
        version: '2.0.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:gem/rack-cors@2.0.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://rubygems.org/gems/rack-cors-2.0.1.gem');
    });

    it('should handle pre-release versions', async () => {
      const purl: ParsedPurl = {
        type: 'gem',
        namespace: null,
        name: 'test',
        version: '1.0.0.pre',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:gem/test@1.0.0.pre',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://rubygems.org/gems/test-1.0.0.pre.gem');
    });
  });

  describe('getOutputFilename', () => {
    it('should generate correct filename', () => {
      const purl: ParsedPurl = {
        type: 'gem',
        namespace: null,
        name: 'rails',
        version: '7.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:gem/rails@7.0.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('rails-7.0.0.gem');
    });
  });
});
