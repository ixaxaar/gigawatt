# GIGAWATT — AI Datacenter Tycoon

Build an AI datacenter 2020→2028: buy real GPUs/NICs/switches, design trays and racks, power and cool a hall,
build a network fabric, and lease capacity for **training** and **inference**. See `SCOPE.md` for the design.

    pnpm install      # (or npm i)
    ./node_modules/.bin/vite          # dev server; add #play/<screen> to skip the title (e.g. /#play/design)
    ./node_modules/.bin/vitest run    # 110 tests: catalog integrity, validation, perf, economy, events, full-loop smoke
    ./node_modules/.bin/vite build

Layout: `src/types.ts` (contract) · `src/data/*` (~150 real parts + codex text) · `src/sim/*` (pure, seeded engine) ·
`src/store.ts` (Zustand game state) · `src/missions.ts` · `src/ui/*` (React + procedural SVG art).
