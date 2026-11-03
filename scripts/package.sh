#!/usr/bin/env bash
# Assemble a distributable zip/tar from a Godot export + the sidecar + a Node runtime.
# usage: package.sh <linux|windows|macos-arm64|macos-x64> <godot-export-dir> <node-dist-dir> <out-dir> <version>
set -euo pipefail
target=$1; exp=$2; nodedir=$3; out=$4; ver=$5
root=$(cd "$(dirname "$0")/.." && pwd)
name="GIGAWATT-$ver-$target"
stage=$(mktemp -d); mkdir -p "$out"; out=$(cd "$out" && pwd)
case $target in
  linux)
    d=$stage/GIGAWATT; mkdir -p "$d/runtime" "$d/sidecar"
    cp "$exp"/GIGAWATT.x86_64 "$exp"/GIGAWATT.pck "$d"/
    cp "$nodedir/bin/node" "$d/runtime/node"; chmod +x "$d"/GIGAWATT.x86_64 "$d/runtime/node"
    cp "$root/godot/sidecar/bridge.mjs" "$d/sidecar/"
    cp "$root/LICENSE" "$d/" 2>/dev/null || true
    printf '#!/bin/sh\ncd "$(dirname "$0")" && exec ./GIGAWATT.x86_64 "$@"\n' > "$d/gigawatt.sh"; chmod +x "$d/gigawatt.sh"
    (cd "$stage" && tar czf "$out/$name.tar.gz" GIGAWATT) ;;
  windows)
    d=$stage/GIGAWATT; mkdir -p "$d/runtime" "$d/sidecar"
    cp "$exp"/GIGAWATT.exe "$exp"/GIGAWATT.pck "$d"/
    cp "$nodedir/node.exe" "$d/runtime/node.exe"
    cp "$root/godot/sidecar/bridge.mjs" "$d/sidecar/"
    cp "$root/LICENSE" "$d/" 2>/dev/null || true
    (cd "$stage" && zip -qr "$out/$name.zip" GIGAWATT) ;;
  macos-*)
    (cd "$stage" && unzip -q "$exp/GIGAWATT.zip")
    app=$(ls -d "$stage"/*.app); res="$app/Contents/Resources"
    mkdir -p "$res/runtime" "$res/sidecar"
    cp "$nodedir/bin/node" "$res/runtime/node"; chmod +x "$res/runtime/node"
    cp "$root/godot/sidecar/bridge.mjs" "$res/sidecar/"
    # ad-hoc sign so Apple Silicon will run it after the quarantine flag is cleared
    if command -v codesign >/dev/null; then codesign --force --deep -s - "$app" || true; fi
    (cd "$stage" && ditto -c -k --keepParent "$(basename "$app")" "$out/$name.zip" 2>/dev/null || zip -qry "$out/$name.zip" "$(basename "$app")") ;;
esac
echo "built $out/$name*"
