// GIGAWATT engine — design actions. Generated from the former store.ts monolith.
import { ok } from './consts';
import type { GameStore } from '../api';
import type { Ctx } from './ctx';

export const designActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    saveTray: (tray) =>
      commit((g) => {
        const i = g.trays.findIndex((t) => t.id === tray.id);
        if (i >= 0) g.trays[i] = tray;
        else g.trays.push(tray);
        logln(g, 'info', `Tray design '${tray.name}' saved.`);
        return ok('Tray saved.');
      }),

    saveRack: (rack) =>
      commit((g) => {
        const i = g.racks.findIndex((r) => r.id === rack.id);
        if (i >= 0) g.racks[i] = rack;
        else g.racks.push(rack);
        logln(g, 'info', `Rack design '${rack.name}' saved.`);
        return ok('Rack saved.');
      }),

  };
};
