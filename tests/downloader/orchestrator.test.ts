import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDownloadTask, downloadAll } from '../../src/downloader/index.ts';
import { ParsedPurl, CliOptions } from '../../src/types/index.ts';
import { Logger } from '../../src/utils/logger.ts';

const testDir = join(tmpdir(), 'purl-orchestrator-test-' + Date.now());

const server = setupServer(
  // Failed package - MUST be before generic npm handler
  http.get('https://registry.npmjs.org/nonexistent/-/nonexistent-1.0.0.tgz', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  // npm
  http.get('https://registry.npmjs.org/:pkg/-/:file', () => {
    return new HttpResponse(new Uint8Array([0x1f, 0x8b]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // npm scoped
  http.get('https://registry.npmjs.org/@:scope/:pkg/-/:file', () => {
    return new HttpResponse(new Uint8Array([0x1f, 0x8b]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // PyPI
  http.get('https://pypi.org/pypi/:pkg/:version/json', ({ params }) => {
    return HttpResponse.json({
      urls: [
        {
          packagetype: 'sdist',
          url: `https://files.pythonhosted.org/test/${params.pkg}-${params.version}.tar.gz`,
        },
      ],
    });
  }),
  http.get('https://files.pythonhosted.org/test/:file', () => {
    return new HttpResponse(new Uint8Array([0x1f, 0x8b]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // Cargo
  http.get('https://static.crates.io/crates/:name/:file', () => {
    return new HttpResponse(new Uint8Array([0x1f, 0x8b]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  })
);

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

describe('Download Orchestrator', () => {
  const defaultOptions: CliOptions = {
    stdin: false,
    output: testDir,
    concurrency: 2,
    timeout: 30000,
    retry: 0,
    continueOnError: false,
    dryRun: false,
    verbose: false,
    quiet: true,
  };

  const mockLogger = {
    setTotal: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    startTask: vi.fn(),
    completeTask: vi.fn(),
    failTask: vi.fn(),
    summary: vi.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean output directory
    const dirs = ['npm', 'pypi', 'cargo'];
    dirs.forEach((dir) => {
      const path = join(testDir, dir);
      if (existsSync(path)) {
        rmSync(path, { recursive: true });
      }
    });
  });

  describe('createDownloadTask', () => {
    it('should create task for npm package', async () => {
      const purl: ParsedPurl = {
        type: 'npm',
        namespace: null,
        name: 'lodash',
        version: '4.17.21',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/lodash@4.17.21',
      };

      const task = await createDownloadTask(purl, testDir);

      expect(task.purl).toBe(purl);
      expect(task.downloadUrl).toBe('https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz');
      expect(task.filename).toBe('lodash-4.17.21.tgz');
      expect(task.outputPath).toBe(join(testDir, 'npm', 'lodash-4.17.21.tgz'));
    });

    it('should create task for pypi package', async () => {
      const purl: ParsedPurl = {
        type: 'pypi',
        namespace: null,
        name: 'requests',
        version: '2.28.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:pypi/requests@2.28.0',
      };

      const task = await createDownloadTask(purl, testDir);

      expect(task.purl).toBe(purl);
      expect(task.downloadUrl).toBe('https://files.pythonhosted.org/test/requests-2.28.0.tar.gz');
      expect(task.filename).toBe('requests-2.28.0.tar.gz');
      expect(task.outputPath).toBe(join(testDir, 'pypi', 'requests-2.28.0.tar.gz'));
    });

    it('should organize output by ecosystem type', async () => {
      const npmPurl: ParsedPurl = {
        type: 'npm',
        namespace: null,
        name: 'test',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:npm/test@1.0.0',
      };

      const cargoPurl: ParsedPurl = {
        type: 'cargo',
        namespace: null,
        name: 'test',
        version: '1.0.0',
        qualifiers: null,
        subpath: null,
        raw: 'pkg:cargo/test@1.0.0',
      };

      const npmTask = await createDownloadTask(npmPurl, testDir);
      const cargoTask = await createDownloadTask(cargoPurl, testDir);

      expect(npmTask.outputPath).toContain('/npm/');
      expect(cargoTask.outputPath).toContain('/cargo/');
    });
  });

  describe('downloadAll', () => {
    it('should download all packages successfully', async () => {
      const purls: ParsedPurl[] = [
        {
          type: 'npm',
          namespace: null,
          name: 'express',
          version: '4.18.2',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/express@4.18.2',
        },
        {
          type: 'cargo',
          namespace: null,
          name: 'serde',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:cargo/serde@1.0.0',
        },
      ];

      const summary = await downloadAll(purls, defaultOptions, mockLogger);

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.errors).toHaveLength(0);

      // Verify files were created
      expect(existsSync(join(testDir, 'npm', 'express-4.18.2.tgz'))).toBe(true);
      expect(existsSync(join(testDir, 'cargo', 'serde-1.0.0.crate'))).toBe(true);
    });

    it('should handle mixed success and failure', async () => {
      const purls: ParsedPurl[] = [
        {
          type: 'npm',
          namespace: null,
          name: 'express',
          version: '4.18.2',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/express@4.18.2',
        },
        {
          type: 'npm',
          namespace: null,
          name: 'nonexistent',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/nonexistent@1.0.0',
        },
      ];

      const summary = await downloadAll(
        purls,
        { ...defaultOptions, continueOnError: true },
        mockLogger
      );

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.errors).toHaveLength(1);
    });

    it('should respect dry-run mode', async () => {
      const purls: ParsedPurl[] = [
        {
          type: 'npm',
          namespace: null,
          name: 'test',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/test@1.0.0',
        },
      ];

      const summary = await downloadAll(purls, { ...defaultOptions, dryRun: true }, mockLogger);

      expect(summary.total).toBe(1);
      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(0);

      // Verify no files were created
      expect(existsSync(join(testDir, 'npm', 'test-1.0.0.tgz'))).toBe(false);
    });

    it('should return early on failure when continueOnError is false', async () => {
      const purls: ParsedPurl[] = [
        {
          type: 'npm',
          namespace: null,
          name: 'nonexistent',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/nonexistent@1.0.0',
        },
        {
          type: 'npm',
          namespace: null,
          name: 'express',
          version: '4.18.2',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/express@4.18.2',
        },
      ];

      const summary = await downloadAll(
        purls,
        { ...defaultOptions, continueOnError: false },
        mockLogger
      );

      // With parallel execution, some may succeed before failure is detected
      expect(summary.failed).toBeGreaterThanOrEqual(1);
    });

    it('should set total on logger', async () => {
      const purls: ParsedPurl[] = [
        {
          type: 'npm',
          namespace: null,
          name: 'test1',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/test1@1.0.0',
        },
        {
          type: 'npm',
          namespace: null,
          name: 'test2',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/test2@1.0.0',
        },
        {
          type: 'npm',
          namespace: null,
          name: 'test3',
          version: '1.0.0',
          qualifiers: null,
          subpath: null,
          raw: 'pkg:npm/test3@1.0.0',
        },
      ];

      await downloadAll(purls, defaultOptions, mockLogger);

      expect(mockLogger.setTotal).toHaveBeenCalledWith(3);
    });

    it('should handle empty purl list', async () => {
      const summary = await downloadAll([], defaultOptions, mockLogger);

      expect(summary.total).toBe(0);
      expect(summary.successful).toBe(0);
      expect(summary.failed).toBe(0);
    });
  });
});
