#!/bin/sh
# Dev launcher: run the project from source with the same Vulkan safeguards as the packaged gigawatt.sh.
cd "$(dirname "$0")" || exit 1
if [ -n "$VK_ICD_FILENAMES" ]; then
  ok=1; old=$IFS; IFS=:
  for f in $VK_ICD_FILENAMES; do [ -e "$f" ] || ok=0; done
  IFS=$old
  [ "$ok" = 1 ] || unset VK_ICD_FILENAMES
fi
exec godot --path . --rendering-driver vulkan --rendering-method forward_plus "$@"
