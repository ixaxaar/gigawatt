// Read-only engine queries — hardware lifecycle (residual values, resale advice).
import { assetValue, rackAccelItem, rackAgeMonths, rackResidualUSD, residualFactor } from '../../sim/lifecycle';
import { G } from './shared';

export interface LifecycleRow {
  id: string; serial: string; hallId: string; hallName: string; design: string; accelerator: string;
  ageMonths: number; residualPct: number; residualUSD: number; saleUSD: number; status: string;
  clusterId?: string; advice: 'keep' | 'consider selling' | 'replace';
}

export const lifecycleQueries: Record<string, (...a: any[]) => any> = {
  lifecycle: () => {
    const g = G();
    const rows: LifecycleRow[] = [];
    let n = 0;
    for (const hall of g.halls) {
      for (const r of hall.racks) {
        n++;
        const residualUSD = rackResidualUSD(g, r);
        const residualPct = Math.round(residualFactor(g, r) * 100);
        rows.push({
          id: r.id,
          serial: `RK-${String(r.serial ?? n).padStart(4, '0')}`,
          hallId: hall.id,
          hallName: hall.name,
          design: g.racks.find((x) => x.id === r.designId)?.name ?? r.designId,
          accelerator: rackAccelItem(g, r.designId)?.name ?? '',
          ageMonths: rackAgeMonths(r, g.month),
          residualPct,
          residualUSD,
          saleUSD: Math.round(residualUSD * 0.85),
          status: r.status,
          ...(r.clusterId ? { clusterId: r.clusterId } : {}),
          advice: residualPct >= 60 ? 'keep' : residualPct >= 30 ? 'consider selling' : 'replace',
        });
      }
    }
    return {
      rows,
      totals: {
        racks: rows.length,
        residualUSD: rows.reduce((s, r) => s + r.residualUSD, 0),
        saleUSD: rows.reduce((s, r) => s + r.saleUSD, 0),
        assetValue: assetValue(g),
      },
    };
  },
};
