// Tiny ambient surface for the Node APIs the engine tooling touches (avoids a @types/node dependency).
declare module 'node:readline' { export function createInterface(o: any): { on(ev: string, cb: (line: string) => void): void }; }
declare module 'node:fs' {
  export function writeFileSync(p: string, d: string): void;
  export function readFileSync(p: string, enc: string): string;
  export function existsSync(p: string): boolean;
  export function mkdirSync(p: string, o?: { recursive?: boolean }): void;
  export function renameSync(a: string, b: string): void;
  export function unlinkSync(p: string): void;
}
declare module 'node:path' { export function join(...p: string[]): string; }
declare module 'node:net' { export function createServer(cb: (sock: any) => void): { listen(port: number, host: string, cb: () => void): void }; }
declare const process: { argv: string[]; stdin: any; stdout: { write(s: string): void }; stderr: { write(s: string): void }; env: Record<string, string | undefined> };
declare const console: { log(...a: unknown[]): void; warn(...a: unknown[]): void; error(...a: unknown[]): void };
declare const localStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
declare const performance: { now(): number };
