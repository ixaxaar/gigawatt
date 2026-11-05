// GIGAWATT engine — contracts actions. Generated from the former store.ts monolith.
import { assignFromRacks, startProject, stepAllProjects } from '../../autopilot';
import type { GameStore } from '../api';
import { getItem } from '../../data';
import { inferenceCapacity } from '../../sim/perf';
import { Cluster, ClusterStats, ValidationIssue } from '../../types';
import { fail, ok, usd } from './consts';
import { Offer } from '../pricing';
import type { Ctx } from './ctx';

export const contractsActions = (c: Ctx): Partial<GameStore> => {
  const { get, set, commit, logln } = c;
  return {
    acceptContract: (contractId) =>
      commit((g) => {
        const i = g.availableContracts.findIndex((c) => c.id === contractId);
        if (i < 0) return fail('Offer not found.');
        const contract = g.availableContracts[i];
        if (g.month > contract.deadlineMonth) return fail('This offer already expired.');
        g.availableContracts.splice(i, 1);
        g.activeContracts.push({
          contract,
          clusterIds: [],
          startMonth: g.month,
          monthsServed: 0,
          slaMisses: 0,
          deployBy: g.month + (contract.rampMonths ?? 4),
        });
        logln(
          g,
          'info',
          `Signed ${contract.customer} (${contract.model.name}). You have until month ${g.month + (contract.rampMonths ?? 4)} to bring a qualifying cluster online — no revenue and no SLA clock until then, but miss it and the customer walks (−reputation).`,
        );
        return ok(`Contract signed. Deploy capacity and assign a cluster by month ${g.month + (contract.rampMonths ?? 4)}.`);
      }),

    assignContract: (contractId, clusterIds) =>
      commit((g) => {
        const ac = g.activeContracts.find((a) => a.contract.id === contractId);
        if (!ac) return fail('Active contract not found.');
        const ids = [...new Set(clusterIds)];
        const clusters = ids.map((id) => g.clusters.find((c) => c.id === id));
        if (clusters.some((c) => !c)) return fail('Unknown cluster in the list.');
        const contract = ac.contract;
        const issues: ValidationIssue[] = [];

        if (contract.kind === 'training') {
          let accelerators = 0;
          let maxDomain = 0;
          let maxScaleOut = 0;
          let totalMemGB = 0;
          for (const cl of clusters) {
            const stats = cl!.stats;
            if (!stats) continue;
            accelerators += stats.accelerators;
            maxDomain = Math.max(maxDomain, stats.scaleUpDomain);
            maxScaleOut = Math.max(maxScaleOut, stats.effScaleOutGBs);
            totalMemGB += stats.totalMemGB;
          }
          if (accelerators < contract.minAccelerators) {
            issues.push({
              severity: 'error',
              code: 'too-few-accelerators',
              message: `Needs ${contract.minAccelerators} coherent accelerators; the assigned set has ${accelerators}.`,
            });
          }
          if (maxDomain < contract.minScaleUpDomain) {
            issues.push({
              severity: 'error',
              code: 'domain-too-small',
              message: `Needs scale-up domains of ${contract.minScaleUpDomain} accelerators (${contract.model.name} runs expert/tensor parallel inside one domain); largest is ${maxDomain}.`,
            });
          }
          if (maxScaleOut < contract.minScaleOutGBsPerAccel) {
            issues.push({
              severity: 'error',
              code: 'scale-out-starved',
              message: `Needs ${contract.minScaleOutGBsPerAccel} GB/s effective scale-out per accelerator; fabric delivers ${maxScaleOut.toFixed(1)}. MFU will collapse.`,
            });
          }
          if (totalMemGB < contract.minTotalMemGB) {
            issues.push({
              severity: 'error',
              code: 'memory-too-small',
              message: `Needs ${contract.minTotalMemGB} GB total for training state; the cluster has ${totalMemGB} GB.`,
            });
          }
        } else {
          let total = 0; let worstTtft = 0;
          for (const cl of clusters) {
            const stats = cl!.stats;
            if (!stats) continue;
            const item = getItem(stats.acceleratorId);
            if (!item || item.kind !== 'accelerator') {
              issues.push({ severity: 'error', code: 'no-accelerators', message: `Cluster '${cl!.name}' has no accelerators to serve inference.` });
              continue;
            }
            const cap = inferenceCapacity(stats, item, contract.model, { contextTokens: contract.contextTokens, tpotMs: contract.tpotMs });
            for (const i of cap.issues) if (i.severity === 'error') issues.push({ ...i, message: `[${cl!.name}] ${i.message}` });
            // other inference contracts already consume a share of this cluster
            let used = 0;
            for (const o of g.activeContracts) {
              if (o.contract.id === contractId || !o.clusterIds.includes(cl!.id)) continue;
              if (o.contract.kind === 'training') { used = 1; break; }
              const oct = o.contract; if (oct.kind !== 'inference') continue;
              const oc = o.clusterIds.map((id) => g.clusters.find((x) => x.id === id)?.stats).filter(Boolean) as ClusterStats[];
              const oCap = oc.reduce((n, st2) => { const it2 = getItem(st2.acceleratorId); return n + (it2?.kind === 'accelerator' ? inferenceCapacity(st2, it2, oct.model, { contextTokens: oct.contextTokens, tpotMs: oct.tpotMs }).tokensPerSec : 0); }, 0);
              used += oCap > 0 ? Math.min(1, oct.tokensPerSec / oCap) : 0;
            }
            total += cap.tokensPerSec * Math.max(0, 1 - Math.min(1, used));
            worstTtft = Math.max(worstTtft, cap.ttftMs);
            if (cap.ttftMs > contract.ttftMs) issues.push({ severity: 'error', code: 'ttft-sla', message: `[${cl!.name}] p95 TTFT ${Math.round(cap.ttftMs)} ms exceeds the ${contract.ttftMs} ms SLA.`, learn: item.id });
          }
          if (total < contract.tokensPerSec) issues.push({ severity: 'error', code: 'tokens-under-capacity', message: `The assigned clusters have ~${usd(total)} tok/s free (after other contracts) of the required ${usd(contract.tokensPerSec)} tok/s at p95 ${contract.tpotMs} ms/TPOT.` });
        }
        if (contract.kind === 'training') {
          for (const cl of clusters) if (g.activeContracts.some((o) => o.contract.id !== contractId && o.clusterIds.includes(cl!.id))) issues.push({ severity: 'error', code: 'cluster-busy', message: `Cluster '${cl!.name}' is already serving another contract; a training job needs it exclusively.` });
        }

        const errors = issues.filter((i) => i.severity === 'error');
        if (errors.length) return fail('The assigned clusters do not meet this contract.', issues);

        ac.clusterIds = ids;
        ac.startMonth = g.month;
        const names = ids.map((id) => g.clusters.find((x) => x.id === id)?.name ?? id).join(' + ');
        logln(g, 'good', `${contract.customer} (${contract.model.name}) now served by ${names}.`);
        return ok(`Serving ${contract.customer}.`, issues);
      }),

    unassignContract: (contractId) =>
      commit((g) => {
        const ac = g.activeContracts.find((a) => a.contract.id === contractId);
        if (!ac) return fail('Active contract not found.');
        if (!ac.clusterIds.length) return fail('This contract has no cluster assigned.');
        ac.clusterIds = [];
        ac.deployBy = Math.max(ac.deployBy ?? g.month, g.month + 2);
        logln(g, 'info', `${ac.contract.customer}: cluster released. Re-assign a qualifying cluster by ${g.month + 2 >= (ac.deployBy ?? 0) ? 'month ' + ac.deployBy : 'the deadline'} or they walk.`);
        return ok('Cluster released; the contract is awaiting deployment again (2 months grace).');
      }),

    assignRacks: (contractId, rackIds) => assignFromRacks(get(), contractId, rackIds),

    startEasy: (contractId, templateId, racks) => { const r = startProject(get(), contractId, templateId, racks); if (r.ok) stepAllProjects(get); return r; },

    stepEasy: () => stepAllProjects(get),

  };
};
