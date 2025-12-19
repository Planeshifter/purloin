import { describe, it, expect } from 'vitest';
import { CargoRegistry } from '../../src/registries/cargo.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('CargoRegistry', () => {
  const registry = new CargoRegistry();

  describe('type', () => {
    it('should have type "cargo"', () => {
      expect(registry.type).toBe('cargo');
    });
  });

  describe('baseUrl', () => {
    it('should use static.crates.io CDN', () => {
      expect(registry.baseUrl).toBe('https://static.crates.io');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct URL', async () => {
      const purl: ParsedPurl = {
        type: 'cargo',
        namespace: null,
        name: 'serde',
        version: '1.0.193',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:cargo/serde@1.0.193',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://static.crates.io/crates/serde/serde-1.0.193.crate');
    });

    it('should handle crates with underscores', async () => {
      const purl: ParsedPurl = {
        type: 'cargo',
        namespace: null,
        name: 'serde_json',
        version: '1.0.108',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:cargo/serde_json@1.0.108',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://static.crates.io/crates/serde_json/serde_json-1.0.108.crate');
    });

    it('should handle pre-release versions', async () => {
      const purl: ParsedPurl = {
        type: 'cargo',
        namespace: null,
        name: 'tokio',
        version: '2.0.0-alpha.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:cargo/tokio@2.0.0-alpha.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://static.crates.io/crates/tokio/tokio-2.0.0-alpha.1.crate');
    });
  });

  describe('getOutputFilename', () => {
    it('should generate correct filename with .crate extension', () => {
      const purl: ParsedPurl = {
        type: 'cargo',
        namespace: null,
        name: 'serde',
        version: '1.0.193',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:cargo/serde@1.0.193',
      };

      expect(registry.getOutputFilename(purl)).toBe('serde-1.0.193.crate');
    });
  });
});
