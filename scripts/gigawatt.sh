#!/bin/sh
# GIGAWATT launcher (Linux). Picks a working Vulkan driver, then starts the game.
#   GIGAWATT_GPU=dgpu   force the discrete (NVIDIA/AMD) GPU
#   GIGAWATT_GPU=igpu   force the integrated GPU
cd "$(dirname "$0")" || exit 1

# A stale VK_ICD_FILENAMES (naming a driver file that no longer exists) makes Vulkan fail to start;
# the game then silently falls back to OpenGL on the integrated GPU. Ignore it when any listed file is missing.
if [ -n "$VK_ICD_FILENAMES" ]; then
  ok=1; old=$IFS; IFS=:
  for f in $VK_ICD_FILENAMES; do [ -e "$f" ] || ok=0; done
  IFS=$old
  if [ "$ok" = 0 ]; then echo "gigawatt: ignoring stale VK_ICD_FILENAMES=$VK_ICD_FILENAMES" >&2; unset VK_ICD_FILENAMES; fi
fi

case "${GIGAWATT_GPU:-}" in
  dgpu)
    export __NV_PRIME_RENDER_OFFLOAD=1 __VK_LAYER_NV_optimus=NVIDIA_only __GLX_VENDOR_LIBRARY_NAME=nvidia
    [ -e /usr/share/vulkan/icd.d/nvidia_icd.json ] && export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json ;;
  igpu)
    for f in /usr/share/vulkan/icd.d/radeon_icd*.json /usr/share/vulkan/icd.d/intel_icd*.json; do
      if [ -e "$f" ]; then export VK_ICD_FILENAMES="$f"; break; fi
    done ;;
esac

exec ./GIGAWATT.x86_64 --rendering-driver vulkan "$@"
