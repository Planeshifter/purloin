import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for various registries
export const handlers = [
  // npm registry
  http.get('https://registry.npmjs.org/:pkg/-/:file', ({ params }) => {
    const file = params.file as string;
    if (file.includes('nonexistent')) {
      return new HttpResponse(null, { status: 404 });
    }
    // Return fake tarball content
    return new HttpResponse(new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // npm scoped packages
  http.get('https://registry.npmjs.org/@:scope/:pkg/-/:file', ({ params }) => {
    const file = params.file as string;
    if (file.includes('nonexistent')) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // PyPI JSON API
  http.get('https://pypi.org/pypi/:pkg/:version/json', ({ params }) => {
    const pkg = params.pkg as string;
    if (pkg === 'nonexistent') {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      urls: [
        {
          packagetype: 'sdist',
          url: `https://files.pythonhosted.org/packages/test/${pkg}-${params.version}.tar.gz`,
          filename: `${pkg}-${params.version}.tar.gz`,
        },
        {
          packagetype: 'bdist_wheel',
          url: `https://files.pythonhosted.org/packages/test/${pkg}-${params.version}.whl`,
          filename: `${pkg}-${params.version}.whl`,
        },
      ],
    });
  }),

  // PyPI files
  http.get('https://files.pythonhosted.org/packages/test/:file', () => {
    return new HttpResponse(new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // Maven Central
  http.get('https://repo.maven.apache.org/maven2/*', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.includes('nonexistent')) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      headers: { 'Content-Type': 'application/java-archive' },
    });
  }),

  // RubyGems
  http.get('https://rubygems.org/gems/:file', ({ params }) => {
    const file = params.file as string;
    if (file.includes('nonexistent')) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x1f, 0x8b, 0x08, 0x00]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  // Cargo / crates.io
  http.get('https://static.crates.io/crates/:name/:file', ({ params }) => {
    const name = params.name as string;
    if (name === 'nonexistent') {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x1f, 0x8b, 0x08, 0x00]), {
      headers: { 'Content-Type': 'application/gzip' },
    });
  }),

  // NuGet
  http.get('https://api.nuget.org/v3-flatcontainer/:id/:version/:file', ({ params }) => {
    const id = params.id as string;
    if (id === 'nonexistent') {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }),

  // Go module proxy
  http.get('https://proxy.golang.org/*', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.includes('nonexistent')) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      headers: { 'Content-Type': 'application/zip' },
    });
  }),

  // Hex.pm
  http.get('https://repo.hex.pm/tarballs/:file', ({ params }) => {
    const file = params.file as string;
    if (file.includes('nonexistent')) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(new Uint8Array([0x1f, 0x8b, 0x08, 0x00]), {
      headers: { 'Content-Type': 'application/x-tar' },
    });
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
