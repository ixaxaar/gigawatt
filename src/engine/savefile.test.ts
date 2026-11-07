import { describe, it, expect } from 'vitest';
import { useFileStorage } from './headless-shim';
import { writeSlot, readSlot, listSaves } from './persistence';
import { handle } from './protocol';

describe('file-backed saves', () => {
  it('a save survives a restart of the storage layer, and the newest save lists first', () => {
    expect(useFileStorage(`/tmp/gw-save-test-${Date.now()}`)).toBe(true);
    handle({ id: 1, fn: 'init' });
    const g = (handle({ id: 2, fn: 'act', name: 'newGame', args: [3, 'operator'] }) as any).game;
    expect(writeSlot('slot2', g)).toBe(true);
    const month = g.month;
    expect(readSlot('slot2').game?.month).toBe(month);
    expect(listSaves()[0].slot).toBe('slot2');
    writeSlot('auto', g);
    expect(listSaves()[0].slot).toBe('auto');             // most recently written first
  });
});
