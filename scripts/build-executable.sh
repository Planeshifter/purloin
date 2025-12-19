#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "Building purloin executable..."

# Clean
rm -rf dist
mkdir -p dist

# Bundle with esbuild
echo "→ Bundling with esbuild..."
npx esbuild src/index.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile=dist/bundle.cjs \
  --external:fsevents

# Generate SEA blob
echo "→ Generating SEA blob..."
node --experimental-sea-config sea-config.json

# Copy node binary
echo "→ Copying node binary..."
cp "$(which node)" dist/purloin

# Remove signature (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "→ Removing code signature..."
  codesign --remove-signature dist/purloin
fi

# Inject the blob
echo "→ Injecting SEA blob..."
npx postject dist/purloin NODE_SEA_BLOB dist/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA

# Re-sign (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "→ Re-signing executable..."
  codesign --sign - dist/purloin
fi

echo ""
echo "✔ Built: dist/purloin"
ls -lh dist/purloin
