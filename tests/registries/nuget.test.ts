import { describe, it, expect } from 'vitest';
import { NugetRegistry } from '../../src/registries/nuget.ts';
import { ParsedPurl } from '../../src/types/index.ts';

describe('NugetRegistry', () => {
  const registry = new NugetRegistry();

  describe('type', () => {
    it('should have type "nuget"', () => {
      expect(registry.type).toBe('nuget');
    });
  });

  describe('baseUrl', () => {
    it('should use NuGet v3 flatcontainer API', () => {
      expect(registry.baseUrl).toBe('https://api.nuget.org/v3-flatcontainer');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct lowercase URL', async () => {
      const purl: ParsedPurl = {
        type: 'nuget',
        namespace: null,
        name: 'Newtonsoft.Json',
        version: '13.0.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:nuget/Newtonsoft.Json@13.0.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://api.nuget.org/v3-flatcontainer/newtonsoft.json/13.0.1/newtonsoft.json.13.0.1.nupkg'
      );
    });

    it('should lowercase both package id and version', async () => {
      const purl: ParsedPurl = {
        type: 'nuget',
        namespace: null,
        name: 'Microsoft.Extensions.DependencyInjection',
        version: '8.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:nuget/Microsoft.Extensions.DependencyInjection@8.0.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://api.nuget.org/v3-flatcontainer/microsoft.extensions.dependencyinjection/8.0.0/microsoft.extensions.dependencyinjection.8.0.0.nupkg'
      );
    });

    it('should handle pre-release versions', async () => {
      const purl: ParsedPurl = {
        type: 'nuget',
        namespace: null,
        name: 'Test.Package',
        version: '1.0.0-Preview.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:nuget/Test.Package@1.0.0-Preview.1',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://api.nuget.org/v3-flatcontainer/test.package/1.0.0-preview.1/test.package.1.0.0-preview.1.nupkg'
      );
    });
  });

  describe('getOutputFilename', () => {
    it('should generate lowercase filename', () => {
      const purl: ParsedPurl = {
        type: 'nuget',
        namespace: null,
        name: 'Newtonsoft.Json',
        version: '13.0.1',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:nuget/Newtonsoft.Json@13.0.1',
      };

      expect(registry.getOutputFilename(purl)).toBe('newtonsoft.json.13.0.1.nupkg');
    });
  });
});
