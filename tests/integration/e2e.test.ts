import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as tar from 'tar';
import AdmZip from 'adm-zip';

const testDir = join(tmpdir(), 'purl-e2e-test-' + Date.now());
const projectRoot = process.cwd();

// Comprehensive mock handlers for all ecosystems
const handlers = [
  // npm packages
  http.get('https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-npm-tarball-lodash')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),
  http.get('https://registry.npmjs.org/express/-/express-4.18.2.tgz', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-npm-tarball-express')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),
  http.get('https://registry.npmjs.org/@babel/core/-/core-7.23.0.tgz', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-npm-tarball-babel')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // PyPI packages
  http.get('https://pypi.org/pypi/requests/2.28.0/json', () => {
    return HttpResponse.json({
      urls: [
        {
          packagetype: 'sdist',
          url: 'https://files.pythonhosted.org/packages/source/requests-2.28.0.tar.gz',
        },
      ],
    });
  }),
  http.get('https://files.pythonhosted.org/packages/source/requests-2.28.0.tar.gz', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-pypi-tarball-requests')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),
  http.get('https://pypi.org/pypi/flask/3.0.0/json', () => {
    return HttpResponse.json({
      urls: [
        {
          packagetype: 'sdist',
          url: 'https://files.pythonhosted.org/packages/source/flask-3.0.0.tar.gz',
        },
      ],
    });
  }),
  http.get('https://files.pythonhosted.org/packages/source/flask-3.0.0.tar.gz', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-pypi-tarball-flask')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // Maven packages
  http.get(
    'https://repo.maven.apache.org/maven2/org/apache/commons/commons-lang3/3.12.0/commons-lang3-3.12.0.jar',
    () => {
      return new HttpResponse(new Uint8Array(Buffer.from('mock-maven-jar')), {
        headers: { 'Content-Type': 'application/java-archive' },
      });
    }
  ),

  // RubyGems
  http.get('https://rubygems.org/gems/rails-7.0.0.gem', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-gem-rails')), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  // Cargo
  http.get('https://static.crates.io/crates/serde/serde-1.0.193.crate', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-cargo-crate-serde')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),
  http.get('https://static.crates.io/crates/tokio/tokio-1.35.0.crate', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-cargo-crate-tokio')), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // NuGet
  http.get(
    'https://api.nuget.org/v3-flatcontainer/newtonsoft.json/13.0.1/newtonsoft.json.13.0.1.nupkg',
    () => {
      return new HttpResponse(new Uint8Array(Buffer.from('mock-nuget-pkg')), {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    }
  ),

  // Go modules
  http.get('https://proxy.golang.org/github.com/gorilla/mux/@v/v1.8.0.zip', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-go-module')), {
      headers: { 'Content-Type': 'application/zip' },
    });
  }),

  // Hex
  http.get('https://repo.hex.pm/tarballs/phoenix-1.7.0.tar', () => {
    return new HttpResponse(new Uint8Array(Buffer.from('mock-hex-tarball')), {
      headers: { 'Content-Type': 'application/x-tar' },
    });
  }),

  // Failure cases
  http.get('https://registry.npmjs.org/nonexistent/-/nonexistent-1.0.0.tgz', () => {
    return new HttpResponse(null, { status: 404 });
  }),
  http.get('https://pypi.org/pypi/nonexistent/1.0.0/json', () => {
    return new HttpResponse(null, { status: 404 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  rmSync(testDir, { recursive: true, force: true });
});

// Helper to run CLI
function runCli(
  args: string[],
  cwd = projectRoot
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = execSync(`npx tsx src/index.ts ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
    };
  }
}

describe('End-to-End Tests', () => {
  const outputDir = join(testDir, 'output');

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });
  });

  describe('CLI Help and Version', () => {
    it('should display help with --help', () => {
      const { stdout, exitCode } = runCli(['--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Download package tarballs');
      expect(stdout).toContain('--file');
      expect(stdout).toContain('--stdin');
      expect(stdout).toContain('--output');
      expect(stdout).toContain('--concurrency');
    });

    it('should display version with --version', () => {
      const { stdout, exitCode } = runCli(['--version']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Input Methods', () => {
    it('should accept PURLs as CLI arguments', () => {
      const { stdout, exitCode } = runCli(['-o', outputDir, '--dry-run', 'pkg:npm/lodash@4.17.21']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('pkg:npm/lodash@4.17.21');
    });

    it('should accept multiple PURLs as CLI arguments', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        'pkg:npm/lodash@4.17.21',
        'pkg:pypi/requests@2.28.0',
        'pkg:cargo/serde@1.0.193',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Found 3 PURL');
    });

    it('should read PURLs from file', () => {
      const purlFile = join(testDir, 'purls.txt');
      writeFileSync(
        purlFile,
        [
          '# Test file',
          'pkg:npm/express@4.18.2',
          'pkg:pypi/flask@3.0.0',
          '',
          '# Another comment',
          'pkg:cargo/tokio@1.35.0',
        ].join('\n')
      );

      const { stdout, exitCode } = runCli(['-o', outputDir, '--dry-run', '-f', purlFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Found 3 PURL');
    });

    it('should combine file and CLI argument inputs', () => {
      const purlFile = join(testDir, 'purls2.txt');
      writeFileSync(purlFile, 'pkg:npm/express@4.18.2');

      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        '-f',
        purlFile,
        'pkg:npm/lodash@4.17.21',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Found 2 PURL');
    });

    it('should fail when no PURLs provided', () => {
      const { stderr, exitCode } = runCli(['-o', outputDir]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('No PURLs provided');
    });
  });

  describe('Output Options', () => {
    it('should use custom output directory', () => {
      const customOutput = join(testDir, 'custom-output');
      const { exitCode } = runCli(['-o', customOutput, '--dry-run', 'pkg:npm/lodash@4.17.21']);
      expect(exitCode).toBe(0);
    });

    it('should show verbose output with -v', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        '-v',
        'pkg:npm/lodash@4.17.21',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('URL:');
      expect(stdout).toContain('Output:');
    });
  });

  describe('Dry Run Mode', () => {
    it('should not download files in dry-run mode', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        'pkg:npm/lodash@4.17.21',
        'pkg:pypi/requests@2.28.0',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Dry run');

      // Verify no files created
      expect(existsSync(join(outputDir, 'npm'))).toBe(false);
      expect(existsSync(join(outputDir, 'pypi'))).toBe(false);
    });

    it('should show all packages that would be downloaded', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        '-v',
        'pkg:npm/lodash@4.17.21',
        'pkg:cargo/serde@1.0.193',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('lodash');
      expect(stdout).toContain('serde');
    });
  });

  describe('All Ecosystems', () => {
    const ecosystemTests = [
      { purl: 'pkg:npm/lodash@4.17.21', ecosystem: 'npm', file: 'lodash-4.17.21.tgz' },
      { purl: 'pkg:npm/babel/core@7.23.0', ecosystem: 'npm', file: 'babel-core-7.23.0.tgz' },
      { purl: 'pkg:pypi/requests@2.28.0', ecosystem: 'pypi', file: 'requests-2.28.0.tar.gz' },
      {
        purl: 'pkg:maven/org.apache.commons/commons-lang3@3.12.0',
        ecosystem: 'maven',
        file: 'org-apache-commons-commons-lang3-3.12.0.jar',
      },
      { purl: 'pkg:gem/rails@7.0.0', ecosystem: 'gem', file: 'rails-7.0.0.gem' },
      { purl: 'pkg:cargo/serde@1.0.193', ecosystem: 'cargo', file: 'serde-1.0.193.crate' },
      {
        purl: 'pkg:nuget/Newtonsoft.Json@13.0.1',
        ecosystem: 'nuget',
        file: 'newtonsoft.json.13.0.1.nupkg',
      },
      {
        purl: 'pkg:golang/github.com/gorilla/mux@v1.8.0',
        ecosystem: 'golang',
        file: 'github.com-gorilla-mux-v1.8.0.zip',
      },
      { purl: 'pkg:hex/phoenix@1.7.0', ecosystem: 'hex', file: 'phoenix-1.7.0.tar' },
      {
        purl: 'pkg:vscode/redhat/vscode-yaml@1.14.0',
        ecosystem: 'vscode',
        file: 'redhat.vscode-yaml-1.14.0.vsix',
      },
    ];

    ecosystemTests.forEach(({ purl, ecosystem, file }) => {
      it(`should resolve ${ecosystem} package: ${purl}`, () => {
        const { stdout, exitCode } = runCli(['-o', outputDir, '--dry-run', '-v', purl]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain(purl);
        expect(stdout).toContain(file);
      });
    });
  });

  describe('Error Handling', () => {
    it('should fail on invalid PURL format', () => {
      const { stderr, exitCode } = runCli(['-o', outputDir, 'invalid-purl']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid PURL');
    });

    it('should fail on unsupported ecosystem', () => {
      const { stderr, exitCode } = runCli(['-o', outputDir, 'pkg:unsupported/package@1.0.0']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Unsupported ecosystem');
    });

    it('should fail on missing version', () => {
      const { stderr, exitCode } = runCli(['-o', outputDir, 'pkg:npm/lodash']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Version is required');
    });

    it('should fail when file does not exist', () => {
      const { exitCode } = runCli(['-o', outputDir, '-f', '/nonexistent/path/purls.txt']);
      expect(exitCode).toBe(1);
    });
  });

  describe('Concurrency Options', () => {
    it('should accept custom concurrency value', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        '-c',
        '10',
        '-v',
        'pkg:npm/lodash@4.17.21',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Concurrency: 10');
    });
  });

  describe('Continue on Error', () => {
    it('should continue downloading on error with --continue-on-error', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        '-e',
        'pkg:npm/lodash@4.17.21',
        'pkg:npm/express@4.18.2',
      ]);
      // Even with -e flag, dry-run should succeed
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Found 2 PURL');
    });
  });

  describe('Summary Output', () => {
    it('should show download summary', () => {
      const { stdout, exitCode } = runCli([
        '-o',
        outputDir,
        '--dry-run',
        'pkg:npm/lodash@4.17.21',
        'pkg:pypi/requests@2.28.0',
        'pkg:cargo/serde@1.0.193',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Download Summary');
      expect(stdout).toContain('Total:');
      expect(stdout).toContain('Successful:');
    });
  });
});

describe('Integration with Real Mocked Downloads', () => {
  const outputDir = join(testDir, 'real-output');

  beforeEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });
  });

  it('should download npm package and organize by ecosystem', async () => {
    // This test uses MSW mocks for the actual download
    const { downloadAll } = await import('../../src/downloader/index.js');
    const { parsePurls } = await import('../../src/purl/parser.js');
    const { Logger } = await import('../../src/utils/logger.js');

    const purls = parsePurls(['pkg:npm/lodash@4.17.21']);
    const logger = new Logger({
      stdin: false,
      output: outputDir,
      concurrency: 1,
      timeout: 30000,
      retry: 0,
      continueOnError: false,
      dryRun: false,
      verbose: false,
      quiet: true,
    });

    const summary = await downloadAll(
      purls,
      {
        stdin: false,
        output: outputDir,
        concurrency: 1,
        timeout: 30000,
        retry: 0,
        continueOnError: false,
        dryRun: false,
        verbose: false,
        quiet: true,
      },
      logger
    );

    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(0);

    // Verify file exists in correct location
    const npmDir = join(outputDir, 'npm');
    expect(existsSync(npmDir)).toBe(true);
    expect(existsSync(join(npmDir, 'lodash-4.17.21.tgz'))).toBe(true);

    // Verify file contents
    const content = readFileSync(join(npmDir, 'lodash-4.17.21.tgz'), 'utf-8');
    expect(content).toBe('mock-npm-tarball-lodash');
  });

  it('should download multiple ecosystems in parallel', async () => {
    const { downloadAll } = await import('../../src/downloader/index.js');
    const { parsePurls } = await import('../../src/purl/parser.js');
    const { Logger } = await import('../../src/utils/logger.js');

    const purls = parsePurls(['pkg:npm/lodash@4.17.21', 'pkg:cargo/serde@1.0.193']);
    const options = {
      stdin: false,
      output: outputDir,
      concurrency: 2,
      timeout: 30000,
      retry: 0,
      continueOnError: false,
      dryRun: false,
      verbose: false,
      quiet: true,
    };
    const logger = new Logger(options);

    const summary = await downloadAll(purls, options, logger);

    expect(summary.successful).toBe(2);

    // Verify organization
    expect(existsSync(join(outputDir, 'npm', 'lodash-4.17.21.tgz'))).toBe(true);
    expect(existsSync(join(outputDir, 'cargo', 'serde-1.0.193.crate'))).toBe(true);

    // Verify directories are separate
    const npmFiles = readdirSync(join(outputDir, 'npm'));
    const cargoFiles = readdirSync(join(outputDir, 'cargo'));
    expect(npmFiles).toContain('lodash-4.17.21.tgz');
    expect(cargoFiles).toContain('serde-1.0.193.crate');
  });
});

describe('Extraction Tests', () => {
  const extractTestDir = join(testDir, 'extract-test');
  const extractOutputDir = join(extractTestDir, 'output');
  let tarGzContent: Buffer;
  let zipContent: Buffer;

  beforeAll(async () => {
    mkdirSync(extractTestDir, { recursive: true });

    // Create a valid tar.gz archive for npm test
    const npmContentDir = join(extractTestDir, 'npm-content');
    mkdirSync(join(npmContentDir, 'package'), { recursive: true });
    writeFileSync(join(npmContentDir, 'package', 'package.json'), '{"name": "test-pkg"}');
    writeFileSync(join(npmContentDir, 'package', 'index.js'), 'module.exports = {};');

    const tarGzPath = join(extractTestDir, 'test-pkg.tgz');
    await tar.create({ gzip: true, file: tarGzPath, cwd: npmContentDir }, ['package']);
    tarGzContent = readFileSync(tarGzPath) as unknown as Buffer;

    // Create a valid zip archive for golang test
    const zip = new AdmZip();
    zip.addFile('go.mod', Buffer.from('module example.com/test\n\ngo 1.21'));
    zip.addFile('main.go', Buffer.from('package main\n\nfunc main() {}'));
    zipContent = zip.toBuffer();
  });

  afterAll(() => {
    rmSync(extractTestDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    if (existsSync(extractOutputDir)) {
      rmSync(extractOutputDir, { recursive: true });
    }
    mkdirSync(extractOutputDir, { recursive: true });
  });

  it('should show --extract option in help', () => {
    const { stdout, exitCode } = runCli(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--extract');
    expect(stdout).toContain('-x');
  });

  it('should indicate extraction in dry-run mode with --extract', () => {
    const { stdout, exitCode } = runCli([
      '-o',
      extractOutputDir,
      '--dry-run',
      '--extract',
      'pkg:npm/lodash@4.17.21',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('download and extract');
  });

  it('should extract tar.gz archive with --extract flag', async () => {
    // Set up MSW handler with real tar.gz content
    server.use(
      http.get('https://registry.npmjs.org/extract-test/-/extract-test-1.0.0.tgz', () => {
        return new HttpResponse(new Uint8Array(tarGzContent), {
          headers: { 'Content-Type': 'application/gzip' },
        });
      })
    );

    const { downloadAll } = await import('../../src/downloader/index.js');
    const { parsePurls } = await import('../../src/purl/parser.js');
    const { Logger } = await import('../../src/utils/logger.js');

    const purls = parsePurls(['pkg:npm/extract-test@1.0.0']);
    const options = {
      stdin: false,
      output: extractOutputDir,
      concurrency: 1,
      timeout: 30000,
      retry: 0,
      continueOnError: false,
      dryRun: false,
      verbose: false,
      quiet: true,
      extract: true,
    };
    const logger = new Logger(options);

    const summary = await downloadAll(purls, options, logger);

    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(0);

    // Verify archive exists
    const archivePath = join(extractOutputDir, 'npm', 'extract-test-1.0.0.tgz');
    expect(existsSync(archivePath)).toBe(true);

    // Verify extraction directory exists
    const extractedDir = join(extractOutputDir, 'npm', 'extract-test-1.0.0');
    expect(existsSync(extractedDir)).toBe(true);

    // Verify extracted contents
    const extractedFiles = readdirSync(extractedDir);
    expect(extractedFiles).toContain('package');

    const packageDir = join(extractedDir, 'package');
    const packageFiles = readdirSync(packageDir);
    expect(packageFiles).toContain('package.json');
    expect(packageFiles).toContain('index.js');

    // Verify file contents
    const packageJson = readFileSync(join(packageDir, 'package.json'), 'utf-8');
    expect(packageJson).toBe('{"name": "test-pkg"}');
  });

  it('should extract zip archive with --extract flag', async () => {
    // Set up MSW handler with real zip content
    server.use(
      http.get('https://proxy.golang.org/example.com/extract-test/@v/v1.0.0.zip', () => {
        return new HttpResponse(new Uint8Array(zipContent), {
          headers: { 'Content-Type': 'application/zip' },
        });
      })
    );

    const { downloadAll } = await import('../../src/downloader/index.js');
    const { parsePurls } = await import('../../src/purl/parser.js');
    const { Logger } = await import('../../src/utils/logger.js');

    const purls = parsePurls(['pkg:golang/example.com/extract-test@v1.0.0']);
    const options = {
      stdin: false,
      output: extractOutputDir,
      concurrency: 1,
      timeout: 30000,
      retry: 0,
      continueOnError: false,
      dryRun: false,
      verbose: false,
      quiet: true,
      extract: true,
    };
    const logger = new Logger(options);

    const summary = await downloadAll(purls, options, logger);

    expect(summary.successful).toBe(1);

    // Verify archive exists
    const archivePath = join(extractOutputDir, 'golang', 'example.com-extract-test-v1.0.0.zip');
    expect(existsSync(archivePath)).toBe(true);

    // Verify extraction directory exists
    const extractedDir = join(extractOutputDir, 'golang', 'example.com-extract-test-v1.0.0');
    expect(existsSync(extractedDir)).toBe(true);

    // Verify extracted contents
    const extractedFiles = readdirSync(extractedDir);
    expect(extractedFiles).toContain('go.mod');
    expect(extractedFiles).toContain('main.go');

    // Verify file contents
    const goMod = readFileSync(join(extractedDir, 'go.mod'), 'utf-8');
    expect(goMod).toContain('module example.com/test');
  });

  it('should not extract when --extract is not provided', async () => {
    server.use(
      http.get('https://registry.npmjs.org/no-extract-test/-/no-extract-test-1.0.0.tgz', () => {
        return new HttpResponse(new Uint8Array(tarGzContent), {
          headers: { 'Content-Type': 'application/gzip' },
        });
      })
    );

    const { downloadAll } = await import('../../src/downloader/index.js');
    const { parsePurls } = await import('../../src/purl/parser.js');
    const { Logger } = await import('../../src/utils/logger.js');

    const purls = parsePurls(['pkg:npm/no-extract-test@1.0.0']);
    const options = {
      stdin: false,
      output: extractOutputDir,
      concurrency: 1,
      timeout: 30000,
      retry: 0,
      continueOnError: false,
      dryRun: false,
      verbose: false,
      quiet: true,
      extract: false, // Extraction disabled
    };
    const logger = new Logger(options);

    const summary = await downloadAll(purls, options, logger);

    expect(summary.successful).toBe(1);

    // Verify archive exists
    const archivePath = join(extractOutputDir, 'npm', 'no-extract-test-1.0.0.tgz');
    expect(existsSync(archivePath)).toBe(true);

    // Verify extraction directory does NOT exist
    const extractedDir = join(extractOutputDir, 'npm', 'no-extract-test-1.0.0');
    expect(existsSync(extractedDir)).toBe(false);
  });
});
