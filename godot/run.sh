#!/bin/sh
# Launch GIGAWATT on the NVIDIA GPU with Vulkan Forward+ (the default loader fails on hybrid AMD+NVIDIA setups).
cd "$(dirname "$0")"
if [ -f /usr/share/vulkan/icd.d/nvidia_icd.json ] && [ -e /dev/nvidia0 ]; then export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json; fi
exec godot --path . --rendering-driver vulkan --rendering-method forward_plus "$@"
