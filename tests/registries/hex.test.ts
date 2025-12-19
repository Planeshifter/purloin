import { describe, it, expect } from 'vitest';
import { HexRegistry } from '../../src/registries/hex.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('HexRegistry', () => {
  const registry = new HexRegistry();

  describe('type', () => {
    it('should have type "hex"', () => {
      expect(registry.type).toBe('hex');
    });
  });

  describe('baseUrl', () => {
    it('should use repo.hex.pm', () => {
      expect(registry.baseUrl).toBe('https://repo.hex.pm');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct URL', async () => {
      const purl: ParsedPurl = {
        type: 'hex',
        namespace: null,
        name: 'phoenix',
        version: '1.7.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:hex/phoenix@1.7.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://repo.hex.pm/tarballs/phoenix-1.7.0.tar');
    });

    it('should handle underscored package names', async () => {
      const purl: ParsedPurl = {
        type: 'hex',
        namespace: null,
        name: 'phoenix_live_view',
        version: '0.20.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:hex/phoenix_live_view@0.20.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://repo.hex.pm/tarballs/phoenix_live_view-0.20.1.tar');
    });

    it('should handle pre-release versions', async () => {
      const purl: ParsedPurl = {
        type: 'hex',
        namespace: null,
        name: 'ecto',
        version: '4.0.0-rc.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:hex/ecto@4.0.0-rc.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://repo.hex.pm/tarballs/ecto-4.0.0-rc.1.tar');
    });
  });

  describe('getOutputFilename', () => {
    it('should generate correct filename with .tar extension', () => {
      const purl: ParsedPurl = {
        type: 'hex',
        namespace: null,
        name: 'phoenix',
        version: '1.7.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:hex/phoenix@1.7.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('phoenix-1.7.0.tar');
    });
  });
});
