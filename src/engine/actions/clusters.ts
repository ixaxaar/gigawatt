// GIGAWATT engine — clusters actions. Generated from the former store.ts monolith.
import { getItem } from '../../data';
import type { GameStore } from '../api';
import { evaluateCluster } from '../../sim/network';
import { Cluster, PlacedRack } from '../../types';
import { fail, ok } from './consts';
import type { Ctx } from './ctx';

export const clustersActions = (c: Ctx): Partial<GameStore> => {
  const { get, set, commit, logln } = c;
  return {
    createCluster: (name, rackIds, fabric) =>
      commit((g) => {
        const ids = [...new Set(rackIds)];
        if (!ids.length) return fail('Pick at least one placed rack.');
        const placed = new Map<string, PlacedRack>();
        for (const hall of g.halls) for (const r of hall.racks) placed.set(r.id, r);
        const unknown = ids.filter((id) => !placed.has(id));
        if (unknown.length) return fail(`Unknown placed racks: ${unknown.join(', ')}.`);
        const claimed = ids.filter((id) => placed.get(id)?.clusterId);
        if (claimed.length) return fail(`Racks already belong to a cluster: ${claimed.join(', ')}.`);
        // monotonic: ids are never reused, so stale references can't silently point at a different cluster
        const nextN = Math.max(g.clusterSeq ?? 0, g.clusters.reduce((m, c) => Math.max(m, parseInt(c.id.replace(/\D/g, '')) || 0), 0)) + 1;
        g.clusterSeq = nextN;
        const cluster: Cluster = { id: `cl-${nextN}`, name, rackIds: ids, fabric };
        const stats = evaluateCluster(cluster, {
          getRack: (id) => { const pid = placed.get(id)?.designId ?? id; return g.racks.find((r) => r.id === pid); },
          getTray: (id) => g.trays.find((t) => t.id === id),
          getItem,
        });
        const errors = stats.issues.filter((i) => i.severity === 'error');
        if (errors.length) return fail('This fabric does not fit the rack set.', errors);
        cluster.stats = stats;
        g.clusters.push(cluster);
        for (const id of ids) placed.get(id)!.clusterId = cluster.id;
        logln(
          g,
          'good',
          `Cluster '${name}': ${stats.accelerators} accelerators, ${stats.powerKW.toFixed(0)} kW, bisection ${stats.bisectionTbps.toFixed(0)} Tb/s.`,
        );
        return ok(`Cluster '${name}' created.`);
      }),

    disbandCluster: (clusterId) =>
      commit((g) => {
        const cl = g.clusters.find((c) => c.id === clusterId);
        if (!cl) return fail('Unknown cluster.');
        for (const h of g.halls) for (const r of h.racks) if (r.clusterId === clusterId) r.clusterId = undefined;
        for (const ac of g.activeContracts) {
          if (!ac.clusterIds.includes(clusterId)) continue;
          ac.clusterIds = ac.clusterIds.filter((x) => x !== clusterId);
          if (!ac.clusterIds.length) ac.deployBy = Math.max(ac.deployBy ?? g.month, g.month + 2);
        }
        g.clusters = g.clusters.filter((c) => c.id !== clusterId);
        g.spotClusters = (g.spotClusters ?? []).filter((x) => x !== clusterId);
        logln(g, 'info', `Cluster '${cl.name}' disbanded — its racks are free to re-cluster.`);
        return ok(`Cluster '${cl.name}' disbanded; racks are free again.`);
      }),

  };
};
