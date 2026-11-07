#!/bin/zsh
# GPU benchmark: median FPS, draw calls and video memory per GPU x graphics tier x window size x scene.
# usage: scripts/bench.sh [out.md]      (needs a display; runs about 12 minutes; writes docs/perf/bench.md by default)
# GPUs are picked by Vulkan ICD file; add or remove entries in GPUS for your machine.
root=${0:A:h:h}; out=${1:-$root/docs/perf/bench.md}; mkdir -p ${out:h}
cd $root/godot || exit 1
export GW_NOKEYNOTE=1 GW_NOCOACH=1 GW_NOAUTOSAVE=1 GW_NODISPLAY=1 GW_NOTHROTTLE=1 GW_STATS=1
typeset -A GPUS; GPUS=(nvidia /usr/share/vulkan/icd.d/nvidia_icd.json radeon /usr/share/vulkan/icd.d/radeon_icd.json)
SIZES=(1280x800 3840x2160); TIERS=(0 1 2 3 4); SCENES=(fresh stress-campus)
tiername=(Potato Low Balanced High Ultra)
{ echo "# Benchmark ($(date +%F))"; echo; echo "Median FPS after warm-up (vsync off, fixed camera, 14 s per run). Draw calls and video memory are the last sample of the run."; echo
  echo "| GPU | Window | Scene | Tier | FPS | Draw calls | VRAM MB |"; echo "|---|---|---|---|---|---|---|"; } > $out
for gpu in ${(k)GPUS}; do
  icd=${GPUS[$gpu]}; [ -e $icd ] || continue
  for wh in $SIZES; do
    printf '[display]\nwindow/size/mode=0\nwindow/size/window_width_override=%s\nwindow/size/window_height_override=%s\n' ${wh%x*} ${wh#*x} > override.cfg
    for sc in $SCENES; do for q in $TIERS; do
      E=(GW_AUTOSTART=operator GW_QUALITY=$q); [ $sc != fresh ] && E+=(GW_SCENARIO=$sc)
      log=$(env VK_ICD_FILENAMES=$icd "${E[@]}" timeout 24 godot --path . --rendering-driver vulkan --print-fps --disable-vsync 2>&1)
      fps=$(echo "$log" | grep -oE "^Project FPS: [0-9]+" | awk '{print $3}' | tail -n +5 | sort -n | awk '{a[NR]=$1} END{print a[int((NR+1)/2)]}')
      st=$(echo "$log" | grep "^STATS" | tail -1)
      draws=$(echo $st | grep -oE "draws=[0-9]+" | cut -d= -f2); vram=$(echo $st | grep -oE "vram_mb=[0-9]+" | cut -d= -f2)
      echo "| $gpu | $wh | $sc | ${tiername[$((q+1))]} | ${fps:-?} | ${draws:-?} | ${vram:-?} |" >> $out
    done; done
  done
done
rm -f override.cfg
echo "wrote $out"
