#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
BOOTSTRAP_DIR="$ROOT/.bootstrap"
TMP_DIR="$(mktemp -d)"
ARCHIVE="$TMP_DIR/fixit-app.zip"

if [ -d "$ROOT/app" ] && [ -f "$ROOT/app/page.tsx" ]; then
  echo "FixIt application source already present; bootstrap not required."
  exit 0
fi

if [ ! -d "$BOOTSTRAP_DIR" ]; then
  echo "ERROR: .bootstrap directory is missing."
  exit 1
fi

PART_COUNT=$(find "$BOOTSTRAP_DIR" -maxdepth 1 -type f -name 'fixit-code.part*' | wc -l | tr -d ' ')
if [ "$PART_COUNT" -lt 10 ]; then
  echo "ERROR: Expected 10 FixIt archive parts but found $PART_COUNT."
  exit 1
fi

echo "Reconstructing FixIt application from $PART_COUNT archive parts..."
cat "$BOOTSTRAP_DIR"/fixit-code.part* | base64 -d > "$ARCHIVE"

if command -v unzip >/dev/null 2>&1; then
  unzip -q -o "$ARCHIVE" -d "$TMP_DIR/unpacked"
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$ARCHIVE" "$TMP_DIR/unpacked" <<'PY'
import sys, zipfile
archive, target = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(archive) as z:
    z.extractall(target)
PY
else
  echo "ERROR: Neither unzip nor python3 is available to extract the application archive."
  exit 1
fi

SOURCE="$TMP_DIR/unpacked/fixit-app"
if [ ! -f "$SOURCE/app/page.tsx" ]; then
  echo "ERROR: Reconstructed archive does not contain fixit-app/app/page.tsx."
  exit 1
fi

# Copy the runnable application into the repository root while leaving the
# existing specification/documentation files in place.
cp -a "$SOURCE"/. "$ROOT"/

# Build artifacts from the development environment should never be deployed.
rm -f "$ROOT/tsconfig.tsbuildinfo"

if [ ! -f "$ROOT/app/page.tsx" ] || [ ! -d "$ROOT/lib" ] || [ ! -d "$ROOT/components" ]; then
  echo "ERROR: FixIt bootstrap validation failed."
  exit 1
fi

echo "FixIt application source reconstructed successfully."
