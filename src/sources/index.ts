import type { SourceHandler, RecoverableEcosystem } from '../types/index.ts';
import { JsdelivrSource } from './jsdelivr.ts';
import { UnpkgSource } from './unpkg.ts';
import { SkypackSource } from './skypack.ts';
import { EsmShSource } from './esm-sh.ts';
import { SoftwareHeritageSource } from './software-heritage.ts';
import { WaybackSource } from './wayback.ts';
import { PypiMirrorsSource } from './mirrors/pypi.ts';
import { RubygemsMirrorsSource } from './mirrors/rubygems.ts';

// All registered sources in priority order
const allSources: SourceHandler[] = [
  // npm CDN sources (high success rate)
  new JsdelivrSource(),
  new UnpkgSource(),
  new SkypackSource(),
  new EsmShSource(),
  // Archive sources
  new SoftwareHeritageSource(),
  new WaybackSource(),
  // Registry mirrors
  new PypiMirrorsSource(),
  new RubygemsMirrorsSource(),
];

// Source name to handler lookup
const sourcesByName = new Map<string, SourceHandler>(
  allSources.map((source) => [source.name, source])
);

// Get all source names
export function getAllSourceNames(): string[] {
  return allSources.map((s) => s.name);
}

// Get sources for a specific ecosystem
export function getSourcesForEcosystem(ecosystem: RecoverableEcosystem): SourceHandler[] {
  return allSources.filter((source) => source.ecosystems.includes(ecosystem));
}

// Get specific sources by name, filtered by ecosystem
export function getSources(
  ecosystem: RecoverableEcosystem,
  sourceNames?: string[]
): SourceHandler[] {
  const ecosystemSources = getSourcesForEcosystem(ecosystem);

  if (!sourceNames || sourceNames.length === 0) {
    return ecosystemSources;
  }

  // Filter to only requested sources that support this ecosystem
  return sourceNames
    .map((name) => sourcesByName.get(name))
    .filter(
      (source): source is SourceHandler =>
        source !== undefined && source.ecosystems.includes(ecosystem)
    );
}

// Get a single source by name
export function getSource(name: string): SourceHandler | undefined {
  return sourcesByName.get(name);
}

// Check if a source name is valid
export function isValidSourceName(name: string): boolean {
  return sourcesByName.has(name);
}

// Validate a list of source names
export function validateSourceNames(names: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const name of names) {
    if (isValidSourceName(name)) {
      valid.push(name);
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}

export { allSources };
