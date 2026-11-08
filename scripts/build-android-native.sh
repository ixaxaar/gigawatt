#!/usr/bin/env bash
# Fetch nodejs-mobile and build the JNI shim into godot/android/build/libs/{debug,release}/arm64-v8a.
set -euo pipefail
cd "$(dirname "$0")/.."
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/android-sdk}}
NDK=${ANDROID_NDK_ROOT:-$(ls -d "$SDK"/ndk/* | tail -1)}
TC=$NDK/toolchains/llvm/prebuilt/linux-x86_64
NM=${NM_VERSION:-v18.20.4}
# Gradle build template (from the matching export templates) plus our overlay (the Java NodeRunner)
TPL=${GODOT_TEMPLATES:-$HOME/.local/share/godot/export_templates/4.7.2.stable}
if [ ! -f godot/android/build/build.gradle ]; then
  mkdir -p godot/android/build; unzip -q -o $TPL/android_source.zip -d godot/android/build; cp $TPL/version.txt godot/android/.build_version
  touch godot/android/build/.gdignore
fi
cp -r godot/android/overlay/. godot/android/build/
W=.work/nodejs-mobile; mkdir -p $W
[ -d $W/bin ] || { curl -fsSL -o $W/nm.zip https://github.com/nodejs-mobile/nodejs-mobile/releases/download/$NM/nodejs-mobile-$NM-android.zip; unzip -q -o $W/nm.zip -d $W; }
for abi in ${ABIS:-arm64-v8a x86_64}; do
  case $abi in arm64-v8a) triple=aarch64-linux-android;; x86_64) triple=x86_64-linux-android;; esac
  for v in debug release; do
    out=godot/android/build/libs/$v/$abi; mkdir -p $out
    $TC/bin/${triple}30-clang++ -std=c++17 -shared -fPIC -O2 -I$W/include/node godot/android/native/gwnode.cpp \
      -L$W/bin/$abi -lnode -llog -static-libstdc++ -o $out/libgwnode.so
    cp $W/bin/$abi/libnode.so $out/
    cp $TC/sysroot/usr/lib/$triple/libc++_shared.so $out/
  done
done
echo "native libs ready"
