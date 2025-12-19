import { describe, it, expect } from 'vitest';
import { VscodeRegistry } from '../../src/registries/vscode.ts';
import { ParsedPurl, PurlParseError } from '../../src/types/index.ts';

describe('VscodeRegistry', () => {
  const registry = new VscodeRegistry();

  describe('type', () => {
    it('should have type "vscode"', () => {
      expect(registry.type).toBe('vscode');
    });
  });

  describe('getDownloadUrl - VS Code Marketplace (default)', () => {
    it('should generate correct Marketplace URL without platform', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'ms-python',
        name: 'python',
        version: '2024.0.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:vscode/ms-python/python@2024.0.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/ms-python/vsextensions/python/2024.0.1/vspackage'
      );
    });

    it('should generate correct Marketplace URL with platform', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'ms-vscode',
        name: 'cpptools',
        version: '1.18.0',
        qualifiers: { platform: 'linux-x64' },
        subpath: null,
        raw: 'pkg:vscode/ms-vscode/cpptools@1.18.0?platform=linux-x64',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/ms-vscode/vsextensions/cpptools/1.18.0/vspackage?targetPlatform=linux-x64'
      );
    });
  });

  describe('getDownloadUrl - Open VSX', () => {
    it('should generate correct Open VSX URL without platform', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'redhat',
        name: 'vscode-yaml',
        version: '1.14.0',
        qualifiers: { repository_url: 'https://open-vsx.org' },
        subpath: null,
        raw: 'pkg:vscode/redhat/vscode-yaml@1.14.0?repository_url=https://open-vsx.org',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://open-vsx.org/api/redhat/vscode-yaml/1.14.0/file/redhat.vscode-yaml-1.14.0.vsix'
      );
    });

    it('should generate correct Open VSX URL with platform', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'spgoding',
        name: 'datapack-language-server',
        version: '4.6.0',
        qualifiers: { platform: 'universal', repository_url: 'https://open-vsx.org' },
        subpath: null,
        raw: 'pkg:vscode/spgoding/datapack-language-server@4.6.0?platform=universal&repository_url=https://open-vsx.org',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://open-vsx.org/api/spgoding/datapack-language-server/4.6.0/file/spgoding.datapack-language-server-4.6.0@universal.vsix'
      );
    });

    it('should handle URL-encoded repository_url', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'redhat',
        name: 'java',
        version: '1.25.0',
        qualifiers: { repository_url: 'https%3A%2F%2Fopen-vsx.org' },
        subpath: null,
        raw: 'pkg:vscode/redhat/java@1.25.0?repository_url=https%3A%2F%2Fopen-vsx.org',
      };

      const url = await registry.getDownloadUrl(purl);
      // The URL-encoded value should still be detected as Open VSX
      expect(url).toContain('open-vsx.org');
    });
  });

  describe('getDownloadUrl - error cases', () => {
    it('should throw PurlParseError when namespace (publisher) is missing', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: null,
        name: 'extension',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:vscode/extension@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(PurlParseError);
      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/publisher/);
    });

    it('should throw error when version is missing', async () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'ms-python',
        name: 'python',
        version: '',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:vscode/ms-python/python',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/Version is required/);
    });
  });

  describe('getOutputFilename', () => {
    it('should generate correct filename without platform', () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'redhat',
        name: 'vscode-yaml',
        version: '1.14.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:vscode/redhat/vscode-yaml@1.14.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('redhat.vscode-yaml-1.14.0.vsix');
    });

    it('should generate correct filename with platform', () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'ms-vscode',
        name: 'cpptools',
        version: '1.18.0',
        qualifiers: { platform: 'linux-x64' },
        subpath: null,
        raw: 'pkg:vscode/ms-vscode/cpptools@1.18.0?platform=linux-x64',
      };

      expect(registry.getOutputFilename(purl)).toBe('ms-vscode.cpptools-1.18.0@linux-x64.vsix');
    });

    it('should handle complex publisher and extension names', () => {
      const purl: ParsedPurl = {
        type: 'vscode',
        namespace: 'ms-vscode-remote',
        name: 'remote-containers',
        version: '0.327.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:vscode/ms-vscode-remote/remote-containers@0.327.0',
      };

      expect(registry.getOutputFilename(purl)).toBe(
        'ms-vscode-remote.remote-containers-0.327.0.vsix'
      );
    });
  });
});
