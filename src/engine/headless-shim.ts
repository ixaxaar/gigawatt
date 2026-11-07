// Import this FIRST in headless entry points: gives the engine an in-memory localStorage.
// The Godot sidecar then calls useFileStorage(dir) so saves survive quitting the game.
import { mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };

/** Back localStorage with one file per key under `dir` (atomic write: temp file then rename). */
export function useFileStorage(dir: string): boolean {
  try { mkdirSync(dir, { recursive: true }); } catch { return false; }
  const file = (k: string) => join(dir, encodeURIComponent(k) + '.json');
  (globalThis as any).localStorage = {
    getItem: (k: string) => { try { const f = file(k); return existsSync(f) ? readFileSync(f, 'utf8') : null; } catch { return null; } },
    setItem: (k: string, v: string) => { const f = file(k); writeFileSync(f + '.tmp', v); renameSync(f + '.tmp', f); },
    removeItem: (k: string) => { try { unlinkSync(file(k)); } catch { /* already gone */ } },
  };
  return true;
}
