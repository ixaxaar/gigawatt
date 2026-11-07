// Headless engine sidecar for the Godot front-end: JSON lines on stdin -> JSON lines on stdout.
// All logic lives in src/engine (protocol.ts); this file is only the stdio transport.
import { createInterface } from 'node:readline';
import { useFileStorage } from './engine/headless-shim';
import { handle } from './engine/protocol';

if (process.argv[2]) useFileStorage(process.argv[2]);   // save directory handed over by the Godot client

createInterface({ input: process.stdin }).on('line', (line) => {
  let req: any;
  try { req = JSON.parse(line); } catch { return; }
  process.stdout.write(JSON.stringify(handle(req)) + '\n');
});
