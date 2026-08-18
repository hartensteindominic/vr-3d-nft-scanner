#!/usr/bin/env bash
# workers/convert-to-usdz.sh
# Server-side helper script to convert GLB/GLTF to USDZ for iOS Quick Look.
# Requirements (choose one):
# - Apple usdzconvert (part of USD toolchain) OR
# - Python tool "gltf2usd" / usd_from_gltf, or using Blender headless with a USD exporter

set -e

INPUT="$1"
OUTPUT_DIR="$2"

if [ -z "$INPUT" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Usage: $0 input.glb output-directory"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')
OUTPUT="$OUTPUT_DIR/${BASENAME}.usdz"

# Prefer usdzconvert if available
if command -v usdzconvert >/dev/null 2>&1; then
  echo "Using usdzconvert to convert $INPUT -> $OUTPUT"
  usdzconvert "$INPUT" "$OUTPUT"
  echo "Converted: $OUTPUT"
  exit 0
fi

# Try blender headless with glTF import + usd export (requires a small python script)
if command -v blender >/dev/null 2>&1; then
  echo "Using Blender headless to convert $INPUT -> $OUTPUT"
  python_script="import bpy,sys
argv = sys.argv[sys.argv.index('--')+1:]
input_path=argv[0]
output_path=argv[1]
# Clean
bpy.ops.wm.read_factory_settings(use_empty=True)
# Import glTF
bpy.ops.import_scene.gltf(filepath=input_path)
# Export USDZ (USDZ available in Blender 3.4+ with USD support)
bpy.ops.wm.usd_export(filepath=output_path)
"
  TMP_PY=$(mktemp /tmp/blender_convert.XXXX.py)
  echo "$python_script" > "$TMP_PY"
  blender --background --python "$TMP_PY" -- "$INPUT" "$OUTPUT"
  rm "$TMP_PY"
  echo "Converted: $OUTPUT"
  exit 0
fi

# If nothing available, print instructions
cat <<EOF
No conversion tools found on PATH.
Install one of the following and re-run:
 - Apple usdzconvert (part of USD toolchain)
 - Blender with USD export enabled
 - A glTF -> USDZ Python tool

As a fallback, consider server-side services (e.g., Apple Object Capture workflows, or a managed conversion microservice).
EOF
exit 2
