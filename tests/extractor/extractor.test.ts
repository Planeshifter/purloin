import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import { extractArchive, getExtractDir } from '../../src/extractor/index.ts';

describe('Extractor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `purloin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getExtractDir', () => {
    it('should remove .tgz extension', () => {
      expect(getExtractDir('/path/to/package-1.0.0.tgz')).toBe('/path/to/package-1.0.0');
    });

    it('should remove .tar.gz extension', () => {
      expect(getExtractDir('/path/to/package-1.0.0.tar.gz')).toBe('/path/to/package-1.0.0');
    });

    it('should remove .zip extension', () => {
      expect(getExtractDir('/path/to/package-1.0.0.zip')).toBe('/path/to/package-1.0.0');
    });

    it('should remove .jar extension', () => {
      expect(getExtractDir('/path/to/artifact-1.0.0.jar')).toBe('/path/to/artifact-1.0.0');
    });

    it('should remove .nupkg extension', () => {
      expect(getExtractDir('/path/to/package.1.0.0.nupkg')).toBe('/path/to/package.1.0.0');
    });

    it('should remove .vsix extension', () => {
      expect(getExtractDir('/path/to/publisher.extension-1.0.0.vsix')).toBe(
        '/path/to/publisher.extension-1.0.0'
      );
    });

    it('should remove .crate extension', () => {
      expect(getExtractDir('/path/to/crate-1.0.0.crate')).toBe('/path/to/crate-1.0.0');
    });

    it('should remove .gem extension', () => {
      expect(getExtractDir('/path/to/gem-1.0.0.gem')).toBe('/path/to/gem-1.0.0');
    });

    it('should remove .tar extension', () => {
      expect(getExtractDir('/path/to/package-1.0.0.tar')).toBe('/path/to/package-1.0.0');
    });

    it('should remove .whl extension', () => {
      expect(getExtractDir('/path/to/package-1.0.0-py3-none-any.whl')).toBe(
        '/path/to/package-1.0.0-py3-none-any'
      );
    });
  });

  describe('extractArchive - tar.gz', () => {
    it('should extract a tar.gz archive (npm)', async () => {
      // Create a test tar.gz file
      const archivePath = join(tempDir, 'test-1.0.0.tgz');
      const contentDir = join(tempDir, 'content');
      await mkdir(contentDir, { recursive: true });
      await writeFile(join(contentDir, 'index.js'), 'console.log("hello");');
      await writeFile(join(contentDir, 'package.json'), '{"name": "test"}');

      await tar.create({ gzip: true, file: archivePath, cwd: tempDir }, ['content']);

      // Clean up content dir
      await rm(contentDir, { recursive: true });

      // Extract
      const extractedPath = await extractArchive(archivePath, 'npm');

      expect(extractedPath).toBe(join(tempDir, 'test-1.0.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('content');

      const innerFiles = await readdir(join(extractedPath, 'content'));
      expect(innerFiles).toContain('index.js');
      expect(innerFiles).toContain('package.json');
    });

    it('should extract a .crate archive (cargo)', async () => {
      const archivePath = join(tempDir, 'serde-1.0.0.crate');
      const contentDir = join(tempDir, 'serde-1.0.0');
      await mkdir(contentDir, { recursive: true });
      await writeFile(join(contentDir, 'Cargo.toml'), '[package]\nname = "serde"');
      await writeFile(join(contentDir, 'src', 'lib.rs'), '// lib').catch(() =>
        mkdir(join(contentDir, 'src')).then(() =>
          writeFile(join(contentDir, 'src', 'lib.rs'), '// lib')
        )
      );

      await tar.create({ gzip: true, file: archivePath, cwd: tempDir }, ['serde-1.0.0']);

      await rm(contentDir, { recursive: true });

      const extractedPath = await extractArchive(archivePath, 'cargo');

      expect(extractedPath).toBe(join(tempDir, 'serde-1.0.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('serde-1.0.0');
    });
  });

  describe('extractArchive - zip', () => {
    it('should extract a zip archive (golang)', async () => {
      const archivePath = join(tempDir, 'module-v1.0.0.zip');

      const zip = new AdmZip();
      zip.addFile('go.mod', Buffer.from('module example.com/module'));
      zip.addFile('main.go', Buffer.from('package main'));
      zip.writeZip(archivePath);

      const extractedPath = await extractArchive(archivePath, 'golang');

      expect(extractedPath).toBe(join(tempDir, 'module-v1.0.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('go.mod');
      expect(files).toContain('main.go');
    });

    it('should extract a .jar file (maven)', async () => {
      const archivePath = join(tempDir, 'commons-lang3-3.12.0.jar');

      const zip = new AdmZip();
      zip.addFile('META-INF/MANIFEST.MF', Buffer.from('Manifest-Version: 1.0'));
      zip.addFile('org/apache/commons/lang3/StringUtils.class', Buffer.from('class data'));
      zip.writeZip(archivePath);

      const extractedPath = await extractArchive(archivePath, 'maven');

      expect(extractedPath).toBe(join(tempDir, 'commons-lang3-3.12.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('META-INF');
      expect(files).toContain('org');
    });

    it('should extract a .nupkg file (nuget)', async () => {
      const archivePath = join(tempDir, 'Newtonsoft.Json.13.0.1.nupkg');

      const zip = new AdmZip();
      zip.addFile('Newtonsoft.Json.nuspec', Buffer.from('<package />'));
      zip.addFile('lib/netstandard2.0/Newtonsoft.Json.dll', Buffer.from('dll data'));
      zip.writeZip(archivePath);

      const extractedPath = await extractArchive(archivePath, 'nuget');

      expect(extractedPath).toBe(join(tempDir, 'Newtonsoft.Json.13.0.1'));
      const files = await readdir(extractedPath);
      expect(files).toContain('Newtonsoft.Json.nuspec');
      expect(files).toContain('lib');
    });

    it('should extract a .vsix file (vscode)', async () => {
      const archivePath = join(tempDir, 'redhat.vscode-yaml-1.14.0.vsix');

      const zip = new AdmZip();
      zip.addFile('extension.vsixmanifest', Buffer.from('<manifest />'));
      zip.addFile('extension/package.json', Buffer.from('{"name": "vscode-yaml"}'));
      zip.writeZip(archivePath);

      const extractedPath = await extractArchive(archivePath, 'vscode');

      expect(extractedPath).toBe(join(tempDir, 'redhat.vscode-yaml-1.14.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('extension.vsixmanifest');
      expect(files).toContain('extension');
    });
  });

  describe('extractArchive - tar', () => {
    it('should extract a plain tar archive (hex)', async () => {
      const archivePath = join(tempDir, 'phoenix-1.7.0.tar');
      const contentDir = join(tempDir, 'phoenix');
      await mkdir(contentDir, { recursive: true });
      await writeFile(join(contentDir, 'mix.exs'), 'defmodule Phoenix.MixProject do');

      await tar.create({ file: archivePath, cwd: tempDir }, ['phoenix']);

      await rm(contentDir, { recursive: true });

      const extractedPath = await extractArchive(archivePath, 'hex');

      expect(extractedPath).toBe(join(tempDir, 'phoenix-1.7.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('phoenix');
    });
  });

  describe('extractArchive - gem', () => {
    it('should extract a gem archive (rubygems)', async () => {
      const archivePath = join(tempDir, 'rails-7.0.0.gem');

      // Create the gem structure: outer tar containing data.tar.gz
      const dataDir = join(tempDir, 'data');
      await mkdir(dataDir, { recursive: true });
      await writeFile(join(dataDir, 'lib', 'rails.rb'), '# Rails').catch(() =>
        mkdir(join(dataDir, 'lib')).then(() =>
          writeFile(join(dataDir, 'lib', 'rails.rb'), '# Rails')
        )
      );

      // Create data.tar.gz
      const dataTarGz = join(tempDir, 'data.tar.gz');
      await tar.create({ gzip: true, file: dataTarGz, cwd: dataDir }, ['.']);

      // Create outer tar (the .gem file)
      await tar.create({ file: archivePath, cwd: tempDir }, ['data.tar.gz']);

      // Cleanup
      await rm(dataDir, { recursive: true });
      await rm(dataTarGz);

      const extractedPath = await extractArchive(archivePath, 'gem');

      expect(extractedPath).toBe(join(tempDir, 'rails-7.0.0'));
      const files = await readdir(extractedPath);
      expect(files).toContain('lib');
    });
  });

  describe('extractArchive - error handling', () => {
    it('should throw ExtractionError for non-existent file', async () => {
      const nonExistent = join(tempDir, 'nonexistent.tgz');

      await expect(extractArchive(nonExistent, 'npm')).rejects.toThrow(/Extraction failed/);
    });

    it('should throw ExtractionError for invalid archive', async () => {
      const invalidArchive = join(tempDir, 'invalid.tgz');
      await writeFile(invalidArchive, 'this is not a valid archive');

      await expect(extractArchive(invalidArchive, 'npm')).rejects.toThrow(/Extraction failed/);
    });

    it('should overwrite existing extraction directory', async () => {
      // Create archive
      const archivePath = join(tempDir, 'test-1.0.0.tgz');
      const contentDir = join(tempDir, 'content');
      await mkdir(contentDir, { recursive: true });
      await writeFile(join(contentDir, 'new.txt'), 'new content');

      await tar.create({ gzip: true, file: archivePath, cwd: tempDir }, ['content']);

      await rm(contentDir, { recursive: true });

      // Create existing directory with old content
      const extractDir = join(tempDir, 'test-1.0.0');
      await mkdir(extractDir, { recursive: true });
      await writeFile(join(extractDir, 'old.txt'), 'old content');

      // Extract - should overwrite
      await extractArchive(archivePath, 'npm');

      const files = await readdir(extractDir);
      expect(files).toContain('content');
      expect(files).not.toContain('old.txt');
    });
  });
});
