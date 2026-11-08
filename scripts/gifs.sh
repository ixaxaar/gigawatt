#!/bin/zsh
# Record the guide clips with Godot's movie writer and encode them: docs/gifs/*.gif (README) and site/assets/*.webp (site and wiki).
# Needs a display and ffmpeg; about 8 minutes. Clips are scripted tours (GW_TOUR in godot/main.gd).
root=${0:A:h:h}; cd $root/godot || exit 1
T=$(mktemp -d); mkdir -p $root/docs/gifs
export GW_NOKEYNOTE=1 GW_NOCOACH=1 GW_NOAUTOSAVE=1 GW_NODISPLAY=1 GW_NOTHROTTLE=1 VK_ICD_FILENAMES=${VK_ICD_FILENAMES:-/usr/share/vulkan/icd.d/nvidia_icd.json}
[ -e $VK_ICD_FILENAMES ] || unset VK_ICD_FILENAMES
printf '[display]\nwindow/size/mode=0\nwindow/size/window_width_override=1280\nwindow/size/window_height_override=720\n' > override.cfg
rec() { # name, tour, extra env...
  local name=$1 tour=$2; shift 2
  env GW_AUTOSTART=operator GW_AUTOPLAY=operator:40 GW_TOUR=$tour "$@" timeout 240 godot --path . --rendering-driver vulkan --write-movie $T/$name.avi --fixed-fps 24 > /dev/null 2>&1
  [ -f $T/$name.avi ] || { echo "MISSING $name"; return; }
  ffmpeg -loglevel error -y -i $T/$name.avi -vf "fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" $root/docs/gifs/$name.gif
  ffmpeg -loglevel error -y -i $T/$name.avi -vf "fps=15,scale=960:-1:flags=lanczos" -c:v libwebp_anim -quality 65 -loop 0 $root/site/assets/$name.webp
  cp $root/site/assets/$name.webp $root/site/wiki/img/$name.webp
}
rec tour-basics basics
rec tour-showroom showroom
rec tour-cables cables
rec tour-looks looks GW_CLEAN=1
rec tour-themes themes
rm -f override.cfg; rm -rf $T
ls -la $root/docs/gifs
