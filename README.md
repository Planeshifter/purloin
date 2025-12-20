<p align="center">
  <img src="assets/hero.png" alt="purloin" width="800" />
</p>

<p align="center">
  <strong>Bulk download & recover package tarballs from PURLs.</strong>
</p>

<p align="center">
  <a href="https://github.com/Planeshifter/purloin/actions/workflows/ci.yml"><img src="https://github.com/Planeshifter/purloin/actions/workflows/ci.yml/badge.svg" alt="Build Status" /></a>
  <a href="https://www.npmjs.com/package/purloin"><img src="https://img.shields.io/npm/v/purloin.svg" alt="npm version" /></a>
  <a href="https://github.com/Planeshifter/purloin/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#features">Features</a> •
  <a href="#usage">Usage</a> •
  <a href="#recovery-mode">Recovery Mode</a> •
  <a href="#ecosystems">Ecosystems</a> •
  <a href="#use-cases">Use Cases</a>
</p>

---

## Why purloin?

**purloin** is a high-performance CLI for downloading package tarballs using [Package URLs (PURLs)](https://github.com/package-url/purl-spec). Whether you're collecting SBOM artifacts, mirroring dependencies, or performing security research, purloin handles it all.

**But what about deleted packages?** purloin includes a powerful **recovery mode** that can find and download packages that have been unpublished or removed from their original registries — using CDN caches, mirrors, and archives.

## Features

- **11 Ecosystems** — npm, PyPI, Maven, RubyGems, Cargo, NuGet, Go, Hex, Composer, VS Code, Chrome
- **Recovery Mode** — Recover deleted packages from jsdelivr, unpkg, Skypack, esm.sh, Software Heritage, Wayback Machine, and registry mirrors
- **Parallel Downloads** — Configurable concurrency with retry logic
- **Streaming** — Handles large files efficiently
- **Archive Extraction** — Unpack tarballs, zips, and gems on the fly
- **Flexible Input** — CLI args, files, or stdin
- **Zero Config** — Works out of the box

## Install

```bash
npm install -g purloin
```

Or with pnpm:

```bash
pnpm add -g purloin
```

### Standalone Binary

Build a standalone executable (no Node.js required):

```bash
git clone https://github.com/Planeshifter/purloin.git && cd purloin
pnpm install && pnpm run build:exe
./dist/purloin --help
```

## Usage

```bash
# Download a single package
purloin pkg:npm/lodash@4.17.21

# Download multiple packages
purloin pkg:npm/express@4.18.2 pkg:pypi/requests@2.31.0 pkg:cargo/serde@1.0.193

# From a file
purloin -f packages.txt

# From stdin (pipe from SBOM tools, etc.)
cat packages.txt | purloin -s

# Extract after download
purloin -x pkg:npm/lodash@4.17.21

# Custom output directory
purloin -o ./artifacts pkg:npm/react@18.2.0

# Dry run — see what would be downloaded
purloin -d pkg:maven/org.apache.commons/commons-lang3@3.12.0
```

## Recovery Mode

**Recover deleted or unpublished packages from CDN caches and archives.**

```bash
# Enable recovery fallback
purloin --recover pkg:npm/event-stream@3.3.6

# Short flag
purloin -R pkg:npm/left-pad@1.3.0

# Filter to specific sources
purloin -R --sources jsdelivr,unpkg pkg:npm/some-deleted-pkg@1.0.0
```

When `--recover` is enabled:

1. First tries the primary registry (npmjs.org, pypi.org, etc.)
2. If that fails (404, timeout), probes recovery sources in parallel
3. Downloads from the first source that has the package
4. Reports which source was used

### Recovery Sources

| Source                | Ecosystems     | Notes                                  |
| --------------------- | -------------- | -------------------------------------- |
| **jsdelivr**          | npm            | Best API, file enumeration             |
| **unpkg**             | npm            | Fast CDN cache                         |
| **Skypack**           | npm            | ESM CDN                                |
| **esm.sh**            | npm            | ESM CDN with caching                   |
| **Software Heritage** | npm, PyPI, gem | Historical archive, excellent coverage |
| **Wayback Machine**   | npm, PyPI, gem | Metadata & snapshots                   |
| **PyPI Mirrors**      | PyPI           | Aliyun, Tsinghua, NJU                  |
| **RubyGems Mirrors**  | gem            | Ruby China, Tsinghua                   |

### Example Output

```
$ purloin --recover -v pkg:npm/deleted-package@1.0.0

✖ npm/deleted-package-1.0.0.tgz - 404 Not Found
↳ Attempting recovery for pkg:npm/deleted-package@1.0.0...

  Recovery sources:
  ✓ jsdelivr (found)
  ✓ unpkg (found)
  ○ software-heritage (2023-06-15)
  - wayback (not found)

✔ npm/deleted-package-1.0.0.tgz via jsdelivr (45.2 KB, 234ms)

Download Summary:
  Total:      1
  Successful: 1 (1 recovered)
  Failed:     0
```

## Ecosystems

| Type             | Example PURL                                        | Registry            |
| ---------------- | --------------------------------------------------- | ------------------- |
| **npm**          | `pkg:npm/lodash@4.17.21`                            | npmjs.org           |
| **npm** (scoped) | `pkg:npm/@babel/core@7.23.0`                        | npmjs.org           |
| **pypi**         | `pkg:pypi/requests@2.31.0`                          | pypi.org            |
| **maven**        | `pkg:maven/org.apache.commons/commons-lang3@3.12.0` | maven.apache.org    |
| **gem**          | `pkg:gem/rails@7.1.0`                               | rubygems.org        |
| **cargo**        | `pkg:cargo/serde@1.0.193`                           | crates.io           |
| **nuget**        | `pkg:nuget/Newtonsoft.Json@13.0.3`                  | nuget.org           |
| **golang**       | `pkg:golang/github.com/gorilla/mux@v1.8.1`          | proxy.golang.org    |
| **hex**          | `pkg:hex/phoenix@1.7.10`                            | hex.pm              |
| **composer**     | `pkg:composer/monolog/monolog@3.5.0`                | packagist.org       |
| **vscode**       | `pkg:vscode/ms-python/python@2024.0.1`              | VS Code Marketplace |
| **chrome**       | `pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm`       | Chrome Web Store    |

## Options

```
Usage: purloin [options] [purls...]

Options:
  -f, --file <path>       Read PURLs from file (one per line)
  -s, --stdin             Read PURLs from stdin
  -o, --output <dir>      Output directory (default: ./output)
  -c, --concurrency <n>   Parallel downloads (default: 5)
  -t, --timeout <ms>      Request timeout (default: 30000)
  -r, --retry <n>         Retry attempts (default: 3)
  -e, --continue-on-error Continue downloading on failures
  -d, --dry-run           Show what would be downloaded
  -x, --extract           Extract archives after download
  -R, --recover           Enable recovery from CDN caches
  --sources <list>        Recovery sources to try (comma-separated)
  -v, --verbose           Verbose output
  -q, --quiet             Suppress non-error output
  -h, --help              Show help
  -V, --version           Show version
```

## Output Structure

```
output/
├── npm/
│   ├── lodash-4.17.21.tgz
│   └── lodash-4.17.21/          # with -x
├── pypi/
│   └── requests-2.31.0.tar.gz
├── cargo/
│   └── serde-1.0.193.crate
└── gem/
    └── rails-7.1.0.gem
```

## Use Cases

### SBOM Artifact Collection

```bash
# Extract PURLs from CycloneDX SBOM and download all packages
jq -r '.components[].purl' sbom.json | purloin -s -o ./artifacts
```

### Dependency Mirroring

```bash
# Mirror all dependencies with high concurrency
purloin -f requirements.txt -o ./mirror -c 20
```

### Security Research

```bash
# Download and extract a suspicious package for analysis
purloin -x pkg:npm/suspicious-package@1.0.0 -o ./analysis
```

### Forensic Recovery

```bash
# Recover a deleted package for incident response
purloin -R -v pkg:npm/malicious-deleted-pkg@1.0.0 -o ./evidence
```

### Batch Processing

```bash
# Process a large list with extraction and error handling
purloin -f purls.txt -x -e -o ./packages --concurrency 10
```

## Input File Format

```
# Comments start with #
pkg:npm/express@4.18.2
pkg:pypi/django@5.0

# Blank lines are ignored
pkg:cargo/tokio@1.35.0
```

## Exit Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| `0`  | All downloads successful     |
| `1`  | One or more downloads failed |

## Notes

- **VS Code extensions**: Defaults to VS Code Marketplace. Add `?repository_url=https://open-vsx.org` for Open VSX.
- **Chrome extensions**: Always downloads latest version; version in PURL is for organization only.
- **PyPI/Composer**: Requires API call to resolve download URL.
- **Recovery**: CDN sources may return partial results (individual files, not tarballs). Full tarball recovery works best with registry mirrors.

## License

[Apache-2.0](LICENSE) © Philipp Burckhardt
