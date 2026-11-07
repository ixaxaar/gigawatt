#!/bin/zsh
# FPS bench: gpu index x resolution x quality on the biggest scenario. Prints median FPS.
cd /run/media/ixaxaar/src/code/src/ai-factory/godot || exit 1
export GW_NOKEYNOTE=1 GW_NOCOACH=1 GW_NOAUTOSAVE=1
run() { # gpu res quality scenario
  local out=$(env GW_AUTOSTART=operator GW_SCENARIO=$4 GW_QUALITY=$3 timeout 22 godot --path . --gpu-index $1 --print-fps --disable-vsync --resolution $2 --windowed 2>&1)
  local dev=$(echo "$out" | grep -m1 -oE "Vulkan [0-9.]+ - Forward[^-]*- Using Device #[0-9]+: [^\n]*" | sed 's/.*Device/dev/')
  local fps=$(echo "$out" | grep -oE "FPS: [0-9]+" | awk '{print $2}' | tail -n +6 | sort -n | awk '{a[NR]=$1} END{print a[int((NR+1)/2)], "min", a[1], "n", NR}')
  echo "gpu=$1 res=$2 q=$3 sc=$4 | $fps | $dev"
}
for g in 0 1; do
  for q in 0 1 2; do
    run $g 1280x800 $q stress-campus
    run $g 3840x2160 $q stress-campus
  done
done
