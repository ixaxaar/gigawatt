// Headless engine sidecar for the Godot front-end: JSON lines on stdin -> JSON lines on stdout.
// All logic lives in src/engine (protocol.ts); this file is only the stdio transport.
import { createInterface } from 'node:readline';
import { useFileStorage } from './engine/headless-shim';
import { handle } from './engine/protocol';

const saveDir = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--port');
if (saveDir) useFileStorage(saveDir);   // save directory handed over by the Godot client

// stdio (desktop: Godot spawns this process), or `--port N` / GW_ENGINE_PORT: serve the same protocol over a loopback socket.
// The socket mode is for hosts that cannot spawn processes and pipe their stdio (Android, iOS: the engine runs in-process in an embedded Node).
const portArg = process.argv.indexOf('--port');
const port = Number(portArg > 0 ? process.argv[portArg + 1] : process.env.GW_ENGINE_PORT ?? 0);
const serve = (input: any, write: (s: string) => void) =>
  createInterface({ input }).on('line', (line) => {
    let req: any;
    try { req = JSON.parse(line); } catch { return; }
    write(JSON.stringify(handle(req)) + '\n');
  });
if (port > 0) {
  const { createServer } = await import('node:net');
  createServer((sock: any) => { sock.setNoDelay(true); serve(sock, (l) => sock.write(l)); }).listen(port, '127.0.0.1', () => process.stderr.write(`engine listening on 127.0.0.1:${port}\n`));
} else serve(process.stdin, (l) => process.stdout.write(l));
