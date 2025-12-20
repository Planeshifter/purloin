# purloin

Bulk download package tarballs from PURLs. Supports 11 ecosystems.

## Install

```bash
pnpm add -g purloin
```

Or build a standalone executable (no Node.js required):

```bash
git clone <repo> && cd purloin
pnpm install
pnpm run build:exe
./dist/purloin --help
```

## Usage

```bash
# Single package
purloin pkg:npm/lodash@4.17.21

# Multiple packages
purloin pkg:npm/express@4.18.2 pkg:pypi/requests@2.31.0 pkg:cargo/serde@1.0.193

# From file
purloin -f packages.txt

# From stdin
cat packages.txt | purloin -s

# Extract after download
purloin -x pkg:npm/lodash@4.17.21

# Dry run
purloin -d pkg:maven/org.apache.commons/commons-lang3@3.12.0
```

## Options

```
-f, --file <path>       Read PURLs from file
-s, --stdin             Read PURLs from stdin
-o, --output <dir>      Output directory (default: ./output)
-x, --extract           Extract archives after download
-c, --concurrency <n>   Parallel downloads (default: 5)
-t, --timeout <ms>      Request timeout (default: 30000)
-r, --retry <n>         Retry attempts (default: 3)
-e, --continue-on-error Continue on failures
-d, --dry-run           Show what would be downloaded
-v, --verbose           Verbose output
-q, --quiet             Errors only
```

## Supported Ecosystems

| Type         | PURL Example                                                               | Registry            |
| ------------ | -------------------------------------------------------------------------- | ------------------- |
| npm          | `pkg:npm/lodash@4.17.21`                                                   | npmjs.org           |
| npm (scoped) | `pkg:npm/@babel/core@7.23.0`                                               | npmjs.org           |
| pypi         | `pkg:pypi/requests@2.31.0`                                                 | pypi.org            |
| maven        | `pkg:maven/org.apache.commons/commons-lang3@3.12.0`                        | maven.apache.org    |
| gem          | `pkg:gem/rails@7.1.0`                                                      | rubygems.org        |
| cargo        | `pkg:cargo/serde@1.0.193`                                                  | crates.io           |
| nuget        | `pkg:nuget/Newtonsoft.Json@13.0.3`                                         | nuget.org           |
| golang       | `pkg:golang/github.com/gorilla/mux@v1.8.1`                                 | proxy.golang.org    |
| hex          | `pkg:hex/phoenix@1.7.10`                                                   | hex.pm              |
| composer     | `pkg:composer/monolog/monolog@3.5.0`                                       | packagist.org       |
| vscode       | `pkg:vscode/ms-python/python@2024.0.1`                                     | VS Code Marketplace |
| vscode       | `pkg:vscode/redhat/vscode-yaml@1.14.0?repository_url=https://open-vsx.org` | Open VSX            |
| chrome       | `pkg:chrome/cjpalhdlnbpafiamejdnhcphjbkeiagm@1.55.0`                       | Chrome Web Store    |

## Output Structure

```
output/
├── npm/
│   ├── lodash-4.17.21.tgz
│   └── lodash-4.17.21/        # with -x
├── pypi/
│   └── requests-2.31.0.tar.gz
├── cargo/
│   └── serde-1.0.193.crate
└── composer/
    └── monolog-monolog-3.5.0.zip
```

## Input File Format

```
# Comments start with #
pkg:npm/express@4.18.2
pkg:pypi/django@5.0

# Blank lines are ignored
pkg:cargo/tokio@1.35.0
```

## Use Cases

**SBOM Artifact Collection**

```bash
# Extract PURLs from CycloneDX SBOM
jq -r '.components[].purl' sbom.json | purloin -s -o ./artifacts
```

**Dependency Mirroring**

```bash
purloin -f requirements.txt -o ./mirror -c 10
```

**Offline Analysis**

```bash
purloin -x pkg:npm/suspicious-package@1.0.0 -o ./analysis
```

**Batch Download with Extraction**

```bash
purloin -f purls.txt -x -o ./packages -v
```

## Exit Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| 0    | Success                      |
| 1    | One or more downloads failed |

## Notes

- VS Code extensions (`vscode`): Defaults to VS Code Marketplace; add `?repository_url=https://open-vsx.org` for Open VSX. Supports `?platform=linux-x64` for platform-specific builds.
- Chrome extensions (`chrome`): Always downloads latest version; version in PURL is for organization only
- PyPI/Composer: Requires API call to resolve download URL
- All downloads use streaming to handle large files efficiently

## License

Apache-2.0
