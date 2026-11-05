// Read-only engine queries — contracts. (Pure functions of the current game; exposed through the bridge.)
import { autoFabric } from '../../autopilot';
import { buildOptions, contractFit, pipeline } from '../../contractfit';
import { getItem } from '../../data';
import { contractNeedGbps } from '../../sim/internet';
import { MODELS } from '../../sim/market';
import { evaluateCluster } from '../../sim/network';
import { inferenceCapacity, trainingTokensPerSec } from '../../sim/perf';
import { Cluster } from '../../types';
import { G, ctxOf } from './shared';

export const contractsQueries: Record<string, (...a: any[]) => any> = {
  contractNeed: (cid) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? contractNeedGbps(c) : 0; },
  evaluateCluster: (cluster: Cluster) => evaluateCluster(cluster, ctxOf(G())),
  clusterPerf: (cluster: Cluster, modelId: string, ctxTokens = 4096) => { const g = G(); const stats = evaluateCluster(cluster, ctxOf(g)); const accel: any = getItem(stats.acceleratorId); const m = MODELS.find(x => x.id === modelId)!; return { stats, train: accel ? trainingTokensPerSec(stats, accel, m) : null, infer: accel ? inferenceCapacity(stats, accel, m, { contextTokens: ctxTokens }) : null }; },
  autoFabric: (rackIds, target) => autoFabric(G(), rackIds, target),
  contractFit: (cid) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? contractFit(g, c) : null; },
  buildOptions: (cid, signedAt) => { const g = G(); const c = g.availableContracts.find(x => x.id === cid) ?? g.activeContracts.find(a => a.contract.id === cid)?.contract; return c ? buildOptions(g, c, signedAt ?? undefined) : []; },
  pipeline: () => pipeline(G()),
};
