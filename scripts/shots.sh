#!/bin/zsh
# Retake the documentation screenshots with the current build (needs a display; about 6 minutes).
# Everything is rendered at 3840x2160 (the UI scales to match) and then downscaled with Lanczos, so edges are supersampled; masters stay in a temp folder.
# Writes docs/screenshots/*.png, site/wiki/img/*.webp and the six site/assets/*.webp used on the home page.
root=${0:A:h:h}; cd $root/godot || exit 1
T=$(mktemp -d)
export GW_NOKEYNOTE=1 GW_NOCOACH=1 GW_NOAUTOSAVE=1 GW_NODISPLAY=1 GW_NOTHROTTLE=1 VK_ICD_FILENAMES=${VK_ICD_FILENAMES:-/usr/share/vulkan/icd.d/nvidia_icd.json}
[ -e $VK_ICD_FILENAMES ] || unset VK_ICD_FILENAMES
printf '[display]\nwindow/size/mode=0\nwindow/size/window_width_override=3840\nwindow/size/window_height_override=2160\n' > override.cfg
shot() { # name, env assignments...
  local name=$1; shift
  env GW_SHOT_AT=8 "$@" GW_SHOT=$T/$name.png timeout 120 godot --path . --rendering-driver vulkan > /dev/null 2>&1
  [ -f $T/$name.png ] || { echo "MISSING $name"; return; }
  magick $T/$name.png -filter Lanczos -resize 1920x -define png:compression-level=9 -strip $root/docs/screenshots/$name.png 2>/dev/null
  magick $T/$name.png -filter Lanczos -resize 1600x -quality 82 -define webp:method=6 $root/site/wiki/img/$name.webp 2>/dev/null
}
A=(GW_AUTOSTART=operator GW_AUTOPLAY=operator:46)
shot hall "${A[@]}"
shot thermal "${A[@]}" GW_THERMAL=1
shot procure "${A[@]}" GW_SCREEN=shop
shot design "${A[@]}" GW_SCREEN=design
shot supercomputer "${A[@]}" GW_SCENARIO=supercomputer GW_SCREEN=network GW_SHOT_AT=10
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
# close-ups: rack rear cabling, the showroom, floor texture, and the Site screen with a few looks
shot rack-cabling "${A[@]}" GW_CLEAN=1 GW_CAM=0,0.3,1.5,2.0,0.3
shot rack-rear "${A[@]}" GW_CLEAN=1 GW_CAM=0,0.35,3.0,2.4,0.3
shot showroom "${A[@]}" GW_SCREEN=shop GW_SHOT_AT=3
shot showroom-cables "${A[@]}" GW_SCREEN=shop GW_SR_CABLES=1 GW_SHOT_AT=3
shot floor-closeup "${S[@]}" GW_HALL=2 GW_CAM=0.7,0.25,3.2,4.5,2
shot site-screen GW_SITE_SCREEN=1 GW_SHOT_AT=5
shot site-white "${A[@]}" GW_CLEAN=1 GW_CAM=0.6,0.45,9,2.6,3 GW_SITE="floor:white,rack:white,light:neutral,accent:cyan"
shot site-marble "${A[@]}" GW_CLEAN=1 GW_CAM=0.6,0.45,9,2.6,3 GW_SITE="floor:black,rack:steel,light:cool,accent:magenta"
shot site-parquet "${A[@]}" GW_CLEAN=1 GW_CAM=0.6,0.45,9,2.6,3 GW_SITE="floor:parquet,rack:graphite,light:warm,accent:orange,walls:brick"
shot theme-paper "${A[@]}" GW_THEME=paper GW_SCREEN=contracts
shot theme-ember "${A[@]}" GW_THEME=ember
shot theme-contrast "${A[@]}" GW_THEME=contrast GW_SCREEN=shop GW_SHOT_AT=4
# device layouts: Steam Deck, phone (landscape) and the network card; each at its own window size, rendered at 2x
sized() { # WxH name env...
  local sz=$1; shift; local w=${sz%x*} h=${sz#*x}
  printf '[display]\nwindow/size/mode=0\nwindow/size/window_width_override=%s\nwindow/size/window_height_override=%s\n' $w $h > override.cfg
  local name=$1; shift
  env GW_SHOT_AT=8 "$@" GW_SHOT=$T/$name.png timeout 120 godot --path . --rendering-driver vulkan > /dev/null 2>&1
  [ -f $T/$name.png ] || { echo "MISSING $name"; return; }
  magick $T/$name.png -filter Lanczos -resize 1600x -quality 82 -define webp:method=6 $root/site/wiki/img/$name.webp 2>/dev/null
  magick $T/$name.png -filter Lanczos -resize 1280x -define png:compression-level=9 -strip $root/docs/screenshots/$name.png 2>/dev/null
}
sized 2560x1600 layout-deck "${A[@]}" GW_LAYOUT=handheld
sized 2560x1600 layout-deck-procure "${A[@]}" GW_LAYOUT=handheld GW_SCREEN=shop GW_SHOT_AT=4
sized 2400x1080 layout-phone "${A[@]}" GW_LAYOUT=phone
sized 2400x1080 layout-phone-customers "${A[@]}" GW_LAYOUT=phone GW_SCREEN=contracts
rm -f override.cfg
for n in hall procure design supercomputer customers build-ledger campus-thermal rack-cabling rack-rear showroom site-screen site-white site-marble site-parquet theme-paper; do magick $root/docs/screenshots/$n.png -filter Lanczos -resize 1600x -quality 82 -define webp:method=6 $root/site/assets/$n.webp; done
rm -rf $T
echo done
