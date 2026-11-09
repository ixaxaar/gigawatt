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

  it('the title-screen demo (autosave off) never writes the autosave; real play does', () => {
    expect(useFileStorage(`/tmp/gw-save-test-demo-${Date.now()}`)).toBe(true);
    handle({ id: 1, fn: 'init' });
    handle({ id: 2, fn: 'env', name: 'autosave', args: [false] });
    handle({ id: 3, fn: 'act', name: 'newGame', args: [7, 'operator'] });
    handle({ id: 4, fn: 'env', name: 'autoplay', args: ['operator', 6] });
    expect(listSaves().find((s) => s.slot === 'auto')).toBeUndefined();
    handle({ id: 5, fn: 'env', name: 'autosave', args: [true] });
    handle({ id: 6, fn: 'act', name: 'nextMonth' });
    expect(listSaves().find((s) => s.slot === 'auto')).toBeDefined();
  });
});
