// JNI shim: runs nodejs-mobile (libnode.so) inside the game process. Java calls NodeRunner.nativeStart(args) on a thread
// with a large stack; node::Start blocks until the engine exits.
#include <jni.h>
#include <android/log.h>
#include <pthread.h>
#include <unistd.h>
#include <string>
#include <vector>
#include <cstring>
#include "node.h"

static void *pump(void *fd) {                       // forward Node's stdout/stderr to logcat
  int rd = (int)(long)fd; char buf[1024]; ssize_t n;
  while ((n = read(rd, buf, sizeof(buf) - 1)) > 0) { buf[n] = 0; __android_log_write(ANDROID_LOG_INFO, "gigawatt-node", buf); }
  return nullptr;
}

extern "C" JNIEXPORT jint JNICALL Java_ing_gigawatt_NodeRunner_nativeStart(JNIEnv *env, jclass, jobjectArray args) {
  int fds[2]; pipe(fds); dup2(fds[1], 1); dup2(fds[1], 2);
  pthread_t t; pthread_create(&t, nullptr, pump, (void *)(long)fds[0]); pthread_detach(t);
  int argc = env->GetArrayLength(args); size_t total = 0; std::vector<std::string> a;
  for (int i = 0; i < argc; i++) {
    jstring s = (jstring)env->GetObjectArrayElement(args, i); const char *c = env->GetStringUTFChars(s, nullptr);
    a.emplace_back(c); total += a.back().size() + 1; env->ReleaseStringUTFChars(s, c);
  }
  char *block = (char *)calloc(total, 1); std::vector<char *> argv; char *p = block;   // libuv wants argv in one contiguous block
  for (auto &s : a) { memcpy(p, s.c_str(), s.size() + 1); argv.push_back(p); p += s.size() + 1; }
  argv.push_back(nullptr);
  return node::Start(argc, argv.data());
}
