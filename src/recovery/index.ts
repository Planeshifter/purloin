import type {
  ParsedPurl,
  RecoveryResult,
  CliOptions,
  RecoverableEcosystem,
} from '../types/index.ts';
import { RECOVERABLE_ECOSYSTEMS } from '../types/index.ts';
import { getSources, validateSourceNames } from '../sources/index.ts';

export function isRecoverableEcosystem(type: string): type is RecoverableEcosystem {
  return RECOVERABLE_ECOSYSTEMS.includes(type as RecoverableEcosystem);
}

export async function attemptRecovery(
  purl: ParsedPurl,
  outputPath: string,
  options: CliOptions
): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    purl,
    sources: [],
    recovered: false,
  };

  // Check if ecosystem supports recovery
  if (!isRecoverableEcosystem(purl.type)) {
    return result;
  }

  // Get applicable sources
  const sourceNames = options.sources;
  const sources = getSources(purl.type, sourceNames);

  if (sources.length === 0) {
    return result;
  }

  // Probe all sources in parallel
  const probeResults = await Promise.all(
    sources.map(async (source) => {
      try {
        return await source.probe(purl, options.timeout);
      } catch (error) {
        return {
          source: source.name,
          status: 'error' as const,
          error: (error as Error).message,
        };
      }
    })
  );

  result.sources = probeResults;

  // Find sources that have the package (in priority order)
  const foundSources = probeResults
    .map((probeResult, index) => ({ probeResult, source: sources[index] }))
    .filter(
      ({ probeResult }) => probeResult.status === 'found' || probeResult.status === 'partial'
    );

  if (foundSources.length === 0) {
    return result;
  }

  // Try to download from the first available source
  for (const { source, probeResult: _probeResult } of foundSources) {
    try {
      const downloadResult = await source.download(purl, outputPath, options.timeout);

      if (downloadResult.status === 'found' || downloadResult.status === 'partial') {
        result.recovered = true;
        result.outputPath = outputPath;

        // Update the source result with download info
        const sourceIndex = result.sources.findIndex((s) => s.source === source.name);
        if (sourceIndex >= 0) {
          result.sources[sourceIndex] = downloadResult;
        }

        break;
      }
    } catch (error) {
      // Update source result with error
      const sourceIndex = result.sources.findIndex((s) => s.source === source.name);
      if (sourceIndex >= 0) {
        result.sources[sourceIndex] = {
          source: source.name,
          status: 'error',
          error: (error as Error).message,
        };
      }
    }
  }

  return result;
}

// Get the source that successfully recovered the package
export function getRecoverySource(result: RecoveryResult): string | undefined {
  if (!result.recovered) {
    return undefined;
  }

  const foundSource = result.sources.find((s) => s.status === 'found' || s.status === 'partial');

  return foundSource?.source;
}

// Validate source names from CLI
export function parseSourcesOption(sourcesArg: string | undefined): {
  valid: string[];
  invalid: string[];
} {
  if (!sourcesArg) {
    return { valid: [], invalid: [] };
  }

  const names = sourcesArg
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return validateSourceNames(names);
}
