declare module 'node:readline' { export function createInterface(o: any): { on(ev: string, cb: (line: string) => void): void }; }
declare module 'node:fs' { export function writeFileSync(p: string, d: string): void; }
declare const process: { stdin: any; stdout: { write(s: string): void } };
