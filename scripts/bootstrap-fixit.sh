#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
BOOTSTRAP_DIR="$ROOT/.bootstrap"
TMP_DIR="$(mktemp -d)"
ARCHIVE="$TMP_DIR/fixit-app.zip"
BASE64_BODY="$TMP_DIR/fixit-body.b64"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [ -d "$ROOT/app" ] && [ -f "$ROOT/app/page.tsx" ]; then
  echo "FixIt application source already present; bootstrap not required."
  exit 0
fi

if [ ! -d "$BOOTSTRAP_DIR" ]; then
  echo "ERROR: .bootstrap directory is missing."
  exit 1
fi

BODY_PARTS=(
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

for part in "${BODY_PARTS[@]}"; do
  if [ ! -f "$part" ]; then
    echo "ERROR: Missing archive part: $part"
    exit 1
  fi
done

cat "${BODY_PARTS[@]}" > "$BASE64_BODY"

validate_zip() {
  local candidate="$1"
  if command -v unzip >/dev/null 2>&1; then
    unzip -tq "$candidate" >/dev/null 2>&1
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$candidate" <<'PY'
import sys, zipfile
try:
    with zipfile.ZipFile(sys.argv[1]) as z:
        if z.testzip() is not None:
            raise SystemExit(1)
except Exception:
    raise SystemExit(1)
PY
  else
    echo "ERROR: Neither unzip nor python3 is available to validate the application archive."
    exit 1
  fi
}

try_tail() {
  local label="$1"
  shift
  local candidate_b64="$TMP_DIR/candidate.b64"
  local candidate_zip="$TMP_DIR/candidate.zip"

  cat "$BASE64_BODY" "$@" > "$candidate_b64"
  if ! base64 -d "$candidate_b64" > "$candidate_zip" 2>/dev/null; then
    echo "Archive candidate $label failed base64 decoding."
    return 1
  fi

  if validate_zip "$candidate_zip"; then
    cp "$candidate_zip" "$ARCHIVE"
    echo "Using validated FixIt archive tail: $label"
    return 0
  fi

  echo "Archive candidate $label failed ZIP validation."
  return 1
}

FOUND_VALID=false

# Prefer the repaired single part10 when present. If it is invalid, fall back
# to the split replacement tail. This makes Railway resilient to either layout.
if [ -f "$BOOTSTRAP_DIR/fixit-code.part10" ]; then
  if try_tail "part10" "$BOOTSTRAP_DIR/fixit-code.part10"; then
    FOUND_VALID=true
  fi
fi

if [ "$FOUND_VALID" = false ] && [ -f "$BOOTSTRAP_DIR/fixit-code.part10a" ] && [ -f "$BOOTSTRAP_DIR/fixit-code.part10b" ]; then
  if try_tail "part10a+part10b" "$BOOTSTRAP_DIR/fixit-code.part10a" "$BOOTSTRAP_DIR/fixit-code.part10b"; then
    FOUND_VALID=true
  fi
fi

if [ "$FOUND_VALID" = false ]; then
  echo "ERROR: None of the available FixIt archive tails produced a valid ZIP."
  exit 1
fi

echo "Reconstructing FixIt application from validated archive..."

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

cp -a "$SOURCE"/. "$ROOT"/
rm -f "$ROOT/tsconfig.tsbuildinfo"

if [ ! -f "$ROOT/app/page.tsx" ] || [ ! -d "$ROOT/lib" ] || [ ! -d "$ROOT/components" ]; then
  echo "ERROR: FixIt bootstrap validation failed."
  exit 1
fi

echo "FixIt application source reconstructed successfully."
