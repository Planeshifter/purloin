import { describe, it, expect } from 'vitest';
import { MavenRegistry } from '../../src/registries/maven.ts';
import { ParsedPurl, PurlParseError } from '../../src/types/index.ts';

describe('MavenRegistry', () => {
  const registry = new MavenRegistry();

  describe('type', () => {
    it('should have type "maven"', () => {
      expect(registry.type).toBe('maven');
    });
  });

  describe('baseUrl', () => {
    it('should use Maven Central', () => {
      expect(registry.baseUrl).toBe('https://repo.maven.apache.org/maven2');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate correct URL with groupId path', async () => {
      const purl: ParsedPurl = {
        type: 'maven',
        namespace: 'org.apache.commons',
        name: 'commons-lang3',
        version: '3.12.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:maven/org.apache.commons/commons-lang3@3.12.0',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://repo.maven.apache.org/maven2/org/apache/commons/commons-lang3/3.12.0/commons-lang3-3.12.0.jar'
      );
    });

    it('should handle single-segment groupId', async () => {
      const purl: ParsedPurl = {
        type: 'maven',
        namespace: 'junit',
        name: 'junit',
        version: '4.13.2',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:maven/junit/junit@4.13.2',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe('https://repo.maven.apache.org/maven2/junit/junit/4.13.2/junit-4.13.2.jar');
    });

    it('should handle deep groupId paths', async () => {
      const purl: ParsedPurl = {
        type: 'maven',
        namespace: 'com.google.guava',
        name: 'guava',
        version: '32.1.3-jre',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:maven/com.google.guava/guava@32.1.3-jre',
      };

      const url = await registry.getDownloadUrl(purl);
      expect(url).toBe(
        'https://repo.maven.apache.org/maven2/com/google/guava/guava/32.1.3-jre/guava-32.1.3-jre.jar'
      );
    });

    it('should throw PurlParseError when namespace (groupId) is missing', async () => {
      const purl: ParsedPurl = {
        type: 'maven',
        namespace: null,
        name: 'artifact',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:maven/artifact@1.0.0',
      };

      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(PurlParseError);
      await expect(registry.getDownloadUrl(purl)).rejects.toThrow(/groupId/);
    });
  });

  describe('getOutputFilename', () => {
    it('should include groupId prefix in filename', () => {
      const purl: ParsedPurl = {
        type: 'maven',
        namespace: 'org.apache.commons',
        name: 'commons-lang3',
        version: '3.12.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:maven/org.apache.commons/commons-lang3@3.12.0',
      };

      expect(registry.getOutputFilename(purl)).toBe('org-apache-commons-commons-lang3-3.12.0.jar');
    });
  });
});
