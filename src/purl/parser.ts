import { PackageURL } from 'packageurl-js';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';
import { PurlParseError, UnsupportedEcosystemError } from '../types/index.ts';

const SUPPORTED_TYPES: Set<string> = new Set([
  'npm',
  'pypi',
  'maven',
  'gem',
  'cargo',
  'nuget',
  'golang',
  'hex',
  'vscode',
  'chrome',
  'composer',
]);

export function parsePurl(purlString: string): ParsedPurl {
  const trimmed = purlString.trim();

  if (!trimmed) {
    throw new PurlParseError(trimmed, 'Empty PURL string');
  }

  let purl: PackageURL;
  try {
    purl = PackageURL.fromString(trimmed);
  } catch (error) {
    throw new PurlParseError(
      trimmed,
      error instanceof Error ? error.message : 'Invalid PURL format'
    );
  }

  if (!SUPPORTED_TYPES.has(purl.type)) {
    throw new UnsupportedEcosystemError(purl.type);
  }

  if (!purl.version) {
    throw new PurlParseError(trimmed, 'Version is required');
  }

  return {
    type: purl.type as EcosystemType,
    namespace: purl.namespace || null,
    name: purl.name,
    version: purl.version,
    qualifiers: purl.qualifiers || null,
    subpath: purl.subpath || null,
    raw: trimmed,
  };
}

export function parsePurls(purlStrings: string[]): ParsedPurl[] {
  return purlStrings
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('#'))
    .map(parsePurl);
}
