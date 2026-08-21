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

# Parts 01-09 contain the main archive body. The final tail was re-uploaded
# as part10a + part10b because the earlier part10 was truncated. Never append
# both the legacy part10 and the replacement tail or the ZIP becomes corrupt.
PARTS=(
  "$BOOTSTRAP_DIR/fixit-code.part01"
  "$BOOTSTRAP_DIR/fixit-code.part02"
  "$BOOTSTRAP_DIR/fixit-code.part03"
  "$BOOTSTRAP_DIR/fixit-code.part04"
  "$BOOTSTRAP_DIR/fixit-code.part05"
  "$BOOTSTRAP_DIR/fixit-code.part06"
  "$BOOTSTRAP_DIR/fixit-code.part07"
  "$BOOTSTRAP_DIR/fixit-code.part08"
  "$BOOTSTRAP_DIR/fixit-code.part09"
)

for part in "${PARTS[@]}"; do
  if [ ! -f "$part" ]; then
    echo "ERROR: Missing archive part: $part"
    exit 1
  fi
done

if [ -f "$BOOTSTRAP_DIR/fixit-code.part10a" ] && [ -f "$BOOTSTRAP_DIR/fixit-code.part10b" ]; then
  PARTS+=("$BOOTSTRAP_DIR/fixit-code.part10a" "$BOOTSTRAP_DIR/fixit-code.part10b")
elif [ -f "$BOOTSTRAP_DIR/fixit-code.part10" ]; then
  PARTS+=("$BOOTSTRAP_DIR/fixit-code.part10")
else
  echo "ERROR: Missing final FixIt archive tail."
  exit 1
fi

echo "Reconstructing FixIt application from ${#PARTS[@]} ordered archive parts..."
cat "${PARTS[@]}" | base64 -d > "$ARCHIVE"

# Validate the ZIP before extraction so Railway reports a useful error.
if command -v unzip >/dev/null 2>&1; then
  unzip -tq "$ARCHIVE" >/dev/null
  unzip -q -o "$ARCHIVE" -d "$TMP_DIR/unpacked"
elif command -v python3 >/dev/null 2>&1; then
  python3 - "$ARCHIVE" "$TMP_DIR/unpacked" <<'PY'
import sys, zipfile
archive, target = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(archive) as z:
    bad = z.testzip()
    if bad:
        raise SystemExit(f"Corrupt ZIP entry: {bad}")
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

cp -a "$SOURCE"/. "$ROOT"/
rm -f "$ROOT/tsconfig.tsbuildinfo"

if [ ! -f "$ROOT/app/page.tsx" ] || [ ! -d "$ROOT/lib" ] || [ ! -d "$ROOT/components" ]; then
  echo "ERROR: FixIt bootstrap validation failed."
  exit 1
fi

echo "FixIt application source reconstructed successfully."
