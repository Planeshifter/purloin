import { describe, it, expect } from 'vitest';
import { parsePurl, parsePurls } from '../../src/purl/parser.ts';
import { PurlParseError, UnsupportedEcosystemError } from '../../src/types/index.ts';

describe('PURL Parser', () => {
  describe('parsePurl', () => {
    describe('valid PURLs', () => {
      it('should parse a simple npm PURL', () => {
        const result = parsePurl('pkg:npm/lodash@4.17.21');
        expect(result.type).toBe('npm');
        expect(result.namespace).toBeNull();
        expect(result.name).toBe('lodash');
        expect(result.version).toBe('4.17.21');
        expect(result.qualifiers).toBeNull();
        expect(result.subpath).toBeNull();
        expect(result.raw).toBe('pkg:npm/lodash@4.17.21');
      });

      it('should parse an npm scoped package PURL', () => {
        const result = parsePurl('pkg:npm/babel/core@7.23.0');
        expect(result.type).toBe('npm');
        expect(result.namespace).toBe('babel');
        expect(result.name).toBe('core');
        expect(result.version).toBe('7.23.0');
      });

      it('should parse a PyPI PURL', () => {
        const result = parsePurl('pkg:pypi/requests@2.28.0');
        expect(result.type).toBe('pypi');
        expect(result.namespace).toBeNull();
        expect(result.name).toBe('requests');
        expect(result.version).toBe('2.28.0');
      });

      it('should parse a Maven PURL with namespace', () => {
        const result = parsePurl('pkg:maven/org.apache.commons/commons-lang3@3.12.0');
        expect(result.type).toBe('maven');
        expect(result.namespace).toBe('org.apache.commons');
        expect(result.name).toBe('commons-lang3');
        expect(result.version).toBe('3.12.0');
      });

      it('should parse a RubyGems PURL', () => {
        const result = parsePurl('pkg:gem/rails@7.0.0');
        expect(result.type).toBe('gem');
        expect(result.namespace).toBeNull();
        expect(result.name).toBe('rails');
        expect(result.version).toBe('7.0.0');
      });

      it('should parse a Cargo PURL', () => {
        const result = parsePurl('pkg:cargo/serde@1.0.193');
        expect(result.type).toBe('cargo');
        expect(result.namespace).toBeNull();
        expect(result.name).toBe('serde');
        expect(result.version).toBe('1.0.193');
      });

      it('should parse a NuGet PURL', () => {
        const result = parsePurl('pkg:nuget/Newtonsoft.Json@13.0.1');
        expect(result.type).toBe('nuget');
        expect(result.namespace).toBeNull();
        expect(result.name).toBe('Newtonsoft.Json');
        expect(result.version).toBe('13.0.1');
      });

      it('should parse a Go PURL', () => {
        const result = parsePurl('pkg:golang/github.com/gorilla/mux@v1.8.0');
        expect(result.type).toBe('golang');
        expect(result.namespace).toBe('github.com/gorilla');
        expect(result.name).toBe('mux');
        expect(result.version).toBe('v1.8.0');
      });

      it('should parse a Hex PURL', () => {
        const result = parsePurl('pkg:hex/phoenix@1.7.0');
        expect(result.type).toBe('hex');
        expect(result.namespace).toBeNull();
        expect(result.name).toBe('phoenix');
        expect(result.version).toBe('1.7.0');
      });

      it('should handle PURL with qualifiers', () => {
        const result = parsePurl(
          'pkg:npm/lodash@4.17.21?vcs_url=git://github.com/lodash/lodash.git'
        );
        expect(result.type).toBe('npm');
        expect(result.name).toBe('lodash');
        expect(result.version).toBe('4.17.21');
        expect(result.qualifiers).toEqual({ vcs_url: 'git://github.com/lodash/lodash.git' });
      });

      it('should handle PURL with subpath', () => {
        const result = parsePurl('pkg:npm/lodash@4.17.21#dist/lodash.min.js');
        expect(result.type).toBe('npm');
        expect(result.name).toBe('lodash');
        expect(result.version).toBe('4.17.21');
        expect(result.subpath).toBe('dist/lodash.min.js');
      });

      it('should trim whitespace from input', () => {
        const result = parsePurl('  pkg:npm/lodash@4.17.21  ');
        expect(result.name).toBe('lodash');
        expect(result.raw).toBe('pkg:npm/lodash@4.17.21');
      });
    });

    describe('invalid PURLs', () => {
      it('should throw PurlParseError for empty string', () => {
        expect(() => parsePurl('')).toThrow(PurlParseError);
        expect(() => parsePurl('   ')).toThrow(PurlParseError);
      });

      it('should throw PurlParseError for invalid format', () => {
        expect(() => parsePurl('not-a-purl')).toThrow(PurlParseError);
        expect(() => parsePurl('npm/lodash@4.17.21')).toThrow(PurlParseError);
        expect(() => parsePurl('pkg:lodash@4.17.21')).toThrow(PurlParseError);
      });

      it('should throw PurlParseError for missing version', () => {
        expect(() => parsePurl('pkg:npm/lodash')).toThrow(PurlParseError);
        expect(() => parsePurl('pkg:npm/lodash')).toThrow(/Version is required/);
      });

      it('should throw UnsupportedEcosystemError for unknown types', () => {
        expect(() => parsePurl('pkg:unknown/package@1.0.0')).toThrow(UnsupportedEcosystemError);
        expect(() => parsePurl('pkg:cocoapods/Alamofire@5.0.0')).toThrow(UnsupportedEcosystemError);
        expect(() => parsePurl('pkg:swift/github.com/Alamofire/Alamofire@5.0.0')).toThrow(
          UnsupportedEcosystemError
        );
      });
    });
  });

  describe('parsePurls', () => {
    it('should parse multiple valid PURLs', () => {
      const results = parsePurls([
        'pkg:npm/lodash@4.17.21',
        'pkg:pypi/requests@2.28.0',
        'pkg:cargo/serde@1.0.193',
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].type).toBe('npm');
      expect(results[1].type).toBe('pypi');
      expect(results[2].type).toBe('cargo');
    });

    it('should filter out empty lines', () => {
      const results = parsePurls(['pkg:npm/lodash@4.17.21', '', '   ', 'pkg:pypi/requests@2.28.0']);
      expect(results).toHaveLength(2);
    });

    it('should filter out comment lines', () => {
      const results = parsePurls([
        '# This is a comment',
        'pkg:npm/lodash@4.17.21',
        '# Another comment',
        'pkg:pypi/requests@2.28.0',
      ]);
      expect(results).toHaveLength(2);
    });

    it('should throw on first invalid PURL', () => {
      expect(() =>
        parsePurls(['pkg:npm/lodash@4.17.21', 'invalid-purl', 'pkg:pypi/requests@2.28.0'])
      ).toThrow(PurlParseError);
    });

    it('should return empty array for empty input', () => {
      expect(parsePurls([])).toEqual([]);
    });

    it('should return empty array for all comments/empty lines', () => {
      expect(parsePurls(['# comment', '', '   '])).toEqual([]);
    });
  });

  describe('ecosystem type coverage', () => {
    const ecosystemTests = [
      { purl: 'pkg:npm/express@4.18.2', type: 'npm' },
      { purl: 'pkg:pypi/django@4.2.0', type: 'pypi' },
      { purl: 'pkg:maven/org.springframework/spring-core@6.0.0', type: 'maven' },
      { purl: 'pkg:gem/nokogiri@1.15.0', type: 'gem' },
      { purl: 'pkg:cargo/tokio@1.35.0', type: 'cargo' },
      { purl: 'pkg:nuget/EntityFramework@6.4.4', type: 'nuget' },
      { purl: 'pkg:golang/golang.org/x/text@v0.14.0', type: 'golang' },
      { purl: 'pkg:hex/ecto@3.11.0', type: 'hex' },
      { purl: 'pkg:vscode/redhat/vscode-yaml@1.14.0', type: 'vscode' },
      { purl: 'pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm@1.55.0', type: 'chrome' },
      { purl: 'pkg:composer/monolog/monolog@3.9.0', type: 'composer' },
    ];

    ecosystemTests.forEach(({ purl, type }) => {
      it(`should correctly identify ${type} ecosystem`, () => {
        const result = parsePurl(purl);
        expect(result.type).toBe(type);
      });
    });
  });
});
