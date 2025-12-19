import { describe, it, expect } from 'vitest';
import { NpmRegistry } from '../../src/registries/npm.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('NpmRegistry', () => {
  const registry = new NpmRegistry();

  describe('type', () => {
    it('should have type "npm"', () => {
      expect(registry.type).toBe('npm');
    });
  });

  describe('baseUrl', () => {
    it('should use registry.npmjs.org', () => {
      expect(registry.baseUrl).toBe('https://registry.npmjs.org');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct URL for unscoped package', async () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: null,
        name: 'lodash',
        version: '4.17.21',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/lodash@4.17.21',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz');
    });

    it('should generate correct URL for scoped package', async () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: 'babel',
        name: 'core',
        version: '7.23.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/babel/core@7.23.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://registry.npmjs.org/@babel/core/-/core-7.23.0.tgz');
    });

    it('should handle namespace with leading @ (user error)', async () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: '@types',
        name: 'node',
        version: '20.11.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/@types/node@20.11.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://registry.npmjs.org/@types/node/-/node-20.11.0.tgz');
    });

    it('should handle complex version strings', async () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: null,
        name: 'test',
        version: '1.0.0-beta.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/test@1.0.0-beta.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://registry.npmjs.org/test/-/test-1.0.0-beta.1.tgz');
    });
  });

  describe('getOutputFilename', () => {
    it('should generate correct filename for unscoped package', () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: null,
        name: 'lodash',
        version: '4.17.21',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/lodash@4.17.21',
      };

      expect(registry.getOutputFilename(purl)).toBe('lodash-4.17.21.tgz');
    });

    it('should generate correct filename for scoped package', () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: 'babel',
        name: 'core',
        version: '7.23.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/babel/core@7.23.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('babel-core-7.23.0.tgz');
    });

    it('should strip @ from namespace in filename', () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: '@types',
        name: 'node',
        version: '20.11.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/@types/node@20.11.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('types-node-20.11.0.tgz');
    });
  });
});
