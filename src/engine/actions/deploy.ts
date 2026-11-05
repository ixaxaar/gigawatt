// GIGAWATT engine — deploy actions. Generated from the former store.ts monolith.
import { getItem } from '../../data';
import type { GameStore } from '../api';
import { RACK_READY_LEAD } from '../../sim/tick';
import { burnInLeadDelta } from '../../sim/policy';
import { validateRack } from '../../sim/validate';
import { PlacedRack, ValidationIssue } from '../../types';
import { COOL_LEVEL, fail, ok, usd } from './consts';
import { availableFor, rackBom, reserve } from '../pricing';
import type { Ctx } from './ctx';

export const deployActions = (c: Ctx): Partial<GameStore> => {
  const { commit, logln } = c;
  return {
    reserveRacks: (designId, racks) =>
      commit((g) => {
        if (!g.racks.some((r) => r.id === designId)) return fail('Unknown rack design.');
        reserve(g, designId, Math.floor(racks));
        return ok(`Reserved ${Math.floor(racks)} rack(s) of this design.`);
      }),

    placeRack: (hallId, designId) =>
      commit((g) => {
        const hall = g.halls.find((h) => h.id === hallId);
        if (!hall) return fail(`Hall '${hallId}' not found.`);
        const design = g.racks.find((r) => r.id === designId);
        if (!design) return fail(`Rack design '${designId}' not found.`);
        if (hall.racks.length >= hall.rackSlots) {
          return fail(`${hall.name} is full (${hall.rackSlots} slots). Build another hall.`);
        }
        if (COOL_LEVEL[design.coolingInterface] > COOL_LEVEL[hall.coolingClass]) {
          return fail(
            `${design.name} needs ${design.coolingInterface.toUpperCase()} cooling; ${hall.name} is only ${hall.coolingClass.toUpperCase()}.`,
            [
              {
                severity: 'error',
                code: 'cooling-mismatch',
                message: `Rack needs ${design.coolingInterface}; hall offers ${hall.coolingClass}.`,
                learn: design.rackId,
              },
            ],
          );
        }
        const wKg = validateRack(design, g.trays, getItem).stats.weightKg;
        if (wKg > hall.floorLoadKgPerRack) {
          return fail(`${design.name} weighs ~${Math.round(wKg)} kg but ${hall.name}'s floor is rated ${hall.floorLoadKgPerRack} kg per rack. Build a liquid/immersion-class hall (slab-on-grade, higher rating) or choose a lighter design.`, [{ severity: 'error', code: 'HALL_FLOOR_LOAD', message: `Rack ${Math.round(wKg)} kg > floor ${hall.floorLoadKgPerRack} kg.`, learn: design.rackId }]);
        }
        const need = rackBom(g, designId) ?? {};
        const free = availableFor(g, designId);
        const missing = Object.entries(need).filter(([id, n]) => (free[id] ?? 0) < n);
        if (missing.length) {
          return fail(
            `Missing parts: ${missing
              .map(([id, n]) => `${n - (free[id] ?? 0)} more × ${getItem(id)?.name ?? id}`)
              .join(', ')}.`,
            missing.map(([id, n]) => ({
              severity: 'error' as const,
              code: 'missing-parts',
              message: `Need ${n} × ${getItem(id)?.name ?? id}, ${free[id] ?? 0} free (${g.inventory[id] ?? 0} in warehouse, rest reserved for other racks).`,
              learn: id,
            })),
          );
        }
        const validation = validateRack(design, g.trays, getItem);
        const errors = validation.issues.filter((i) => i.severity === 'error');
        if (errors.length) return fail('Rack design has validation errors — fix it in the designer.', errors);

        for (const [id, n] of Object.entries(need)) {
          g.inventory[id] -= n;
          if (g.inventory[id] <= 0) delete g.inventory[id];
        }
        g.rackSeq = (g.rackSeq ?? g.halls.reduce((n, h) => n + h.racks.length, 0)) + 1;
        reserve(g, designId, -1);
        const rack: PlacedRack = {
          id: `RK-${String(g.rackSeq).padStart(4, "0")}`,
          serial: g.rackSeq,
          designId,
          slot: hall.racks.length,
          status: 'installing',
          readyMonth: g.month + RACK_READY_LEAD + burnInLeadDelta(g),
          installedMonth: g.month,
        };
        hall.racks.push(rack);

        const liveKW = hall.racks
          .filter((r) => r.status !== 'failed')
          .reduce((kw, r) => {
            const d = g.racks.find((x) => x.id === r.designId);
            return kw + (d ? validateRack(d, g.trays, getItem).stats.kW : 0);
          }, 0);
        const warns: ValidationIssue[] = [];
        if (liveKW > hall.itPowerKW) {
          warns.push({
            severity: 'warn',
            code: 'power-overcommit',
            message: `${hall.name} IT load ~${usd(liveKW)} kW exceeds provisioned ${usd(hall.itPowerKW)} kW — racks will throttle or trip.`,
          });
        }
        if (liveKW > hall.coolingKW) {
          warns.push({
            severity: 'warn',
            code: 'cooling-overcommit',
            message: `${hall.name} heat load ~${usd(liveKW)} kW exceeds heat rejection ${usd(hall.coolingKW)} kW — expect thermal failures (3x MTBF stress).`,
          });
        }
        logln(
          g,
          'info',
          `Placed ${design.name} in ${hall.name} slot ${rack.slot}; install + commissioning, online ~month ${rack.readyMonth}.`,
        );
        return ok(`Rack placed; online ~month ${rack.readyMonth}.`, warns);
      }),

  };
};
