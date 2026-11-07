#!/bin/zsh
# Retake the documentation screenshots with the current build (needs a display; about 4 minutes).
# Writes docs/screenshots/*.png, site/wiki/img/*.webp and the six site/assets/*.webp used on the home page.
root=${0:A:h:h}; cd $root/godot || exit 1
T=$(mktemp -d)
export GW_NOKEYNOTE=1 GW_NOCOACH=1 GW_NOAUTOSAVE=1 GW_NODISPLAY=1 GW_NOTHROTTLE=1 VK_ICD_FILENAMES=${VK_ICD_FILENAMES:-/usr/share/vulkan/icd.d/nvidia_icd.json}
[ -e $VK_ICD_FILENAMES ] || unset VK_ICD_FILENAMES
printf '[display]\nwindow/size/mode=0\nwindow/size/window_width_override=1920\nwindow/size/window_height_override=1080\n' > override.cfg
shot() { # name, env assignments...
  local name=$1; shift
  env "$@" GW_SHOT=$T/$name.png GW_SHOT_AT=8 timeout 120 godot --path . --rendering-driver vulkan > /dev/null 2>&1
  [ -f $T/$name.png ] || { echo "MISSING $name"; return; }
  magick $T/$name.png -resize 1920x $root/docs/screenshots/$name.png 2>/dev/null
  magick $T/$name.png -resize 1600x -quality 80 $root/site/wiki/img/$name.webp 2>/dev/null
}
A=(GW_AUTOSTART=operator GW_AUTOPLAY=operator:46)
shot hall "${A[@]}"
shot thermal "${A[@]}" GW_THERMAL=1
shot procure "${A[@]}" GW_SCREEN=shop
shot design "${A[@]}" GW_SCREEN=design
shot supercomputer "${A[@]}" GW_SCREEN=network
shot customers "${A[@]}" GW_SCREEN=contracts
shot codex "${A[@]}" GW_SCREEN=codex
shot build-ledger "${A[@]}" GW_SCREEN=facility
shot contract-offers "${A[@]}" GW_SCREEN=contracts
shot overview-needs "${A[@]}"
shot settings-graphics GW_AUTOSTART=operator GW_SETTINGS=1 GW_SETTINGS_TAB=Graphics
S=(GW_AUTOSTART=operator GW_SCENARIO=stress-all-racks GW_CLEAN=1 GW_CAM=auto)
shot campus-rdhx "${S[@]}" GW_HALL=1
shot campus-dlc "${S[@]}" GW_HALL=2
shot campus-thermal "${S[@]}" GW_HALL=2 GW_THERMAL=1
shot campus-aisle "${S[@]}" GW_HALL=0
rm -f override.cfg
for n in hall procure design supercomputer customers build-ledger campus-thermal; do magick $root/docs/screenshots/$n.png -resize 1600x -quality 80 $root/site/assets/$n.webp; done
rm -rf $T
echo done
