# Benchmark (2026-11-08)

Median FPS after warm-up (vsync off, fixed camera, 14 s per run). Draw calls and video memory are the last sample of the run.

Machine: Ryzen 9 9900X, RTX 4090 (`nvidia`) and the CPU's own Radeon iGPU with 2 compute units (`radeon`, roughly a quarter of a Steam Deck). The window is forced to the stated size, so "3840x2160" is a real 4K surface. Potato and Low use the automatic 3D resolution (about 1.3 megapixels on weak GPUs, bilinear upscaling on integrated GPUs); Balanced and above render at full resolution.

Reading it: the 4090 never drops below 240 FPS at 4K on any tier. The iGPU is playable at 1280x800 up to Balanced and at 4K on Potato and Low; High and Ultra are meant for discrete GPUs. Before the 0.6 work the same iGPU ran 3 FPS on High at 4K and 14 FPS on Low.

| GPU | Window | Scene | Tier | FPS | Draw calls | VRAM MB |
|---|---|---|---|---|---|---|
| nvidia | 1280x800 | fresh | Potato | 2352 | 338 | 158 |
| nvidia | 1280x800 | fresh | Low | 2139 | 363 | 177 |
| nvidia | 1280x800 | fresh | Balanced | 2073 | 363 | 226 |
| nvidia | 1280x800 | fresh | High | 1402 | 363 | 383 |
| nvidia | 1280x800 | fresh | Ultra | 1202 | 363 | 559 |
| nvidia | 1280x800 | stress-campus | Potato | 2262 | 373 | 170 |
| nvidia | 1280x800 | stress-campus | Low | 1973 | 396 | 189 |
| nvidia | 1280x800 | stress-campus | Balanced | 1865 | 396 | 238 |
| nvidia | 1280x800 | stress-campus | High | 1348 | 396 | 395 |
| nvidia | 1280x800 | stress-campus | Ultra | 1183 | 396 | 571 |
| nvidia | 3840x2160 | fresh | Potato | 265 | 333 | 359 |
| nvidia | 3840x2160 | fresh | Low | 262 | 359 | 377 |
| nvidia | 3840x2160 | fresh | Balanced | 271 | 359 | 666 |
| nvidia | 3840x2160 | fresh | High | 260 | 359 | 1330 |
| nvidia | 3840x2160 | fresh | Ultra | 248 | 359 | 2041 |
| nvidia | 3840x2160 | stress-campus | Potato | 280 | 357 | 359 |
| nvidia | 3840x2160 | stress-campus | Low | 281 | 383 | 378 |
| nvidia | 3840x2160 | stress-campus | Balanced | 291 | 383 | 667 |
| nvidia | 3840x2160 | stress-campus | High | 264 | 383 | 1330 |
| nvidia | 3840x2160 | stress-campus | Ultra | 246 | 383 | 2041 |
| radeon | 1280x800 | fresh | Potato | 113 | 338 | 154 |
| radeon | 1280x800 | fresh | Low | 73 | 363 | 173 |
| radeon | 1280x800 | fresh | Balanced | 58 | 363 | 223 |
| radeon | 1280x800 | fresh | High | 15 | 363 | 380 |
| radeon | 1280x800 | fresh | Ultra | 12 | 363 | 554 |
| radeon | 1280x800 | stress-campus | Potato | 113 | 373 | 166 |
| radeon | 1280x800 | stress-campus | Low | 72 | 396 | 185 |
| radeon | 1280x800 | stress-campus | Balanced | 59 | 396 | 234 |
| radeon | 1280x800 | stress-campus | High | 14 | 396 | 392 |
| radeon | 1280x800 | stress-campus | Ultra | 12 | 396 | 565 |
| radeon | 3840x2160 | fresh | Potato | 41 | 333 | 276 |
| radeon | 3840x2160 | fresh | Low | 28 | 359 | 309 |
| radeon | 3840x2160 | fresh | Balanced | 5 | 359 | 644 |
| radeon | 3840x2160 | fresh | High | 2 | 359 | 1293 |
| radeon | 3840x2160 | fresh | Ultra | 2 | 359 | 1967 |
| radeon | 3840x2160 | stress-campus | Potato | 43 | 357 | 277 |
| radeon | 3840x2160 | stress-campus | Low | 27 | 383 | 309 |
| radeon | 3840x2160 | stress-campus | Balanced | 5 | 383 | 644 |
| radeon | 3840x2160 | stress-campus | High | 2 | 393 | 1294 |
| radeon | 3840x2160 | stress-campus | Ultra | 2 | 393 | 1968 |
