import { mkdir, rm } from 'node:fs/promises';
import { dirname, basename, join, extname } from 'node:path';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import type { EcosystemType } from '../types/index.ts';
import { ExtractionError } from '../types/index.ts';

// Archive format types
type ArchiveFormat = 'tar.gz' | 'tar' | 'zip' | 'gem';

// Map ecosystem types to their archive formats
const ECOSYSTEM_FORMATS: Record<EcosystemType, ArchiveFormat> = {
  npm: 'tar.gz',
  pypi: 'tar.gz', // Most common, .whl files are handled separately
  maven: 'zip', // .jar files are zip format
  gem: 'gem', // Special: tar containing data.tar.gz
  cargo: 'tar.gz', // .crate files
  nuget: 'zip', // .nupkg files
  golang: 'zip', // Go modules are .zip
  hex: 'tar', // Hex packages are plain .tar
  vscode: 'zip', // .vsix files are zip format
  chrome: 'zip', // Chrome extensions are zip format
  composer: 'zip', // Composer packages are zip format
};

/**
 * Determine the archive format based on file extension and ecosystem
 */
function detectFormat(filePath: string, ecosystem: EcosystemType): ArchiveFormat {
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath).toLowerCase();

  // Check specific extensions first
  if (
    ext === '.zip' ||
    ext === '.whl' ||
    ext === '.jar' ||
    ext === '.nupkg' ||
    ext === '.vsix' ||
    ext === '.crx'
  ) {
    return 'zip';
  }
  if (ext === '.gem') {
    return 'gem';
  }
  if (filename.endsWith('.tar.gz') || ext === '.tgz' || ext === '.crate') {
    return 'tar.gz';
  }
  if (ext === '.tar') {
    return 'tar';
  }

  // Fall back to ecosystem default
  return ECOSYSTEM_FORMATS[ecosystem];
}

/**
 * Get the output directory name for extraction
 */
export function getExtractDir(archivePath: string): string {
  const dir = dirname(archivePath);
  let name = basename(archivePath);

  // Remove all archive extensions
  const extensions = [
    '.tar.gz',
    '.tgz',
    '.tar',
    '.zip',
    '.jar',
    '.nupkg',
    '.vsix',
    '.whl',
    '.crate',
    '.gem',
    '.crx',
  ];
  for (const ext of extensions) {
    if (name.toLowerCase().endsWith(ext)) {
      name = name.slice(0, -ext.length);
      break;
    }
  }

  return join(dir, name);
}

/**
 * Extract a tar.gz archive
 */
async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  await tar.extract({
    file: archivePath,
    cwd: destDir,
    strip: 0, // Don't strip leading path components
  });
}

/**
 * Extract a plain tar archive
 */
async function extractTar(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  await tar.extract({
    file: archivePath,
    cwd: destDir,
    strip: 0,
  });
}

/**
 * Extract a zip archive (also handles .jar, .nupkg, .vsix, .whl)
 */
async function extractZip(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(destDir, true);
}

/**
 * Extract a RubyGem archive
 * Gems are tar archives containing metadata.gz and data.tar.gz
 * We extract data.tar.gz which contains the actual gem contents
 */
async function extractGem(archivePath: string, destDir: string): Promise<void> {
  // First, extract the outer tar to a temp location
  const tempDir = `${destDir}.gem-temp`;
  await mkdir(tempDir, { recursive: true });

  try {
    await tar.extract({
      file: archivePath,
      cwd: tempDir,
    });

    // Now extract data.tar.gz to the final destination
    const dataTarGz = join(tempDir, 'data.tar.gz');
    await mkdir(destDir, { recursive: true });
    await tar.extract({
      file: dataTarGz,
      cwd: destDir,
    });
  } finally {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Extract an archive to a directory
 * @param archivePath Path to the archive file
 * @param ecosystem The ecosystem type (used to determine format)
 * @returns Path to the extracted directory
 */
export async function extractArchive(
  archivePath: string,
  ecosystem: EcosystemType
): Promise<string> {
  const format = detectFormat(archivePath, ecosystem);
  const destDir = getExtractDir(archivePath);

  try {
    // Remove existing directory if present
    await rm(destDir, { recursive: true, force: true });

    switch (format) {
      case 'tar.gz':
        await extractTarGz(archivePath, destDir);
        break;
      case 'tar':
        await extractTar(archivePath, destDir);
        break;
      case 'zip':
        await extractZip(archivePath, destDir);
        break;
      case 'gem':
        await extractGem(archivePath, destDir);
        break;
      default:
        throw new ExtractionError(archivePath, `Unknown archive format: ${format}`);
    }

    return destDir;
  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error;
    }
    throw new ExtractionError(archivePath, (error as Error).message);
  }
}
