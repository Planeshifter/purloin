import { describe, it, expect } from 'vitest';
import { ChromeRegistry } from '../../src/registries/chrome.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('ChromeRegistry', () => {
  const registry = new ChromeRegistry();

  describe('type', () => {
    it('should have type "chrome"', () => {
      expect(registry.type).toBe('chrome');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return correct Chrome Web Store URL', async () => {
      const purl: ParsedPurl = {
        type: 'chrome',
        namespace: null,
        name: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', // uBlock Origin
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm@1.0.0',
      };

      const url = await registry.getDownloadUrl(purl);

      expect(url).toContain('clients2.google.com/service/update2/crx');
      expect(url).toContain('response=redirect');
      expect(url).toContain('prodversion=2147483647');
      expect(url).toContain('cjpalhdlnbpafiamejdnhcphjbkeiagm');
      expect(url).toContain('acceptformat=crx3');
    });

    it('should throw error for invalid extension ID (too short)', async () => {
      const purl: ParsedPurl = {
        type: 'chrome',
        namespace: null,
        name: 'abc123',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:chrome/abc123@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Invalid Chrome extension ID/);
    });

    it('should throw error for invalid extension ID (contains uppercase)', async () => {
      const purl: ParsedPurl = {
        type: 'chrome',
        namespace: null,
        name: 'CJPALHDLNBPAFIAMEJDNHCPHJBKEIAGM',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:chrome/CJPALHDLNBPAFIAMEJDNHCPHJBKEIAGM@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Invalid Chrome extension ID/);
    });

    it('should throw error for invalid extension ID (contains numbers)', async () => {
      const purl: ParsedPurl = {
        type: 'chrome',
        namespace: null,
        name: 'cjpalhdlnbpafiamejdnhcphjbkei123',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkei123@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Invalid Chrome extension ID/);
    });

    it('should throw error when version is missing', async () => {
      const purl: ParsedPurl = {
        type: 'chrome',
        namespace: null,
        name: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
        version: '',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Version is required/);
    });
  });

  describe('getOutputFilename', () => {
    it('should return correct filename', () => {
      const purl: ParsedPurl = {
        type: 'chrome',
        namespace: null,
        name: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
        version: '1.55.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm@1.55.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('cjpalhdlnbpafiamejdnhcphjbkeiagm-1.55.0.crx');
    });
  });
});
