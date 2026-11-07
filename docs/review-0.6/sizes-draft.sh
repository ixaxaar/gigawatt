#!/bin/zsh
# Screenshot key screens at several window sizes (temporary override.cfg, removed at the end).
G=/run/media/ixaxaar/src/code/src/ai-factory/godot
T=/home/ixaxaar/.claude/jobs/1029f783/tmp/sizes
mkdir -p $T; cd $G || exit 1
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json GW_NOKEYNOTE=1 GW_NOCOACH=1 GW_NOAUTOSAVE=1
for wh in 1280x800 1366x768 1920x1080 2560x1440 3440x1440 3840x2160; do
  w=${wh%x*}; h=${wh#*x}
  printf '[display]\nwindow/size/mode=0\nwindow/size/window_width_override=%s\nwindow/size/window_height_override=%s\nwindow/size/resizable=true\n' $w $h > override.cfg
  for sc in title dash contracts design shop network; do
    E=(GW_AUTOSTART=operator GW_AUTOPLAY=operator:30 GW_SCREEN=$sc)
    [ $sc = title ] && E=()
    [ $sc = dash ] && E=(GW_AUTOSTART=operator GW_AUTOPLAY=operator:30)
    env "${E[@]}" GW_SHOT=$T/${wh}_$sc.png GW_SHOT_AT=7 timeout 60 godot --path . --rendering-driver vulkan >/dev/null 2>&1
  done
  env GW_AUTOSTART=operator GW_CARD=dilemma:0 GW_SHOT=$T/${wh}_card.png GW_SHOT_AT=6 timeout 60 godot --path . --rendering-driver vulkan >/dev/null 2>&1
  env GW_AUTOSTART=operator GW_SETTINGS=1 GW_SHOT=$T/${wh}_settings.png GW_SHOT_AT=6 timeout 60 godot --path . --rendering-driver vulkan >/dev/null 2>&1
done
rm -f override.cfg
for f in $T/*.png; do magick identify -format "%f %wx%h\n" $f; done
