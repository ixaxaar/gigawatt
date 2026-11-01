import type { Chassis, Cpu, Nic, TrayDesign } from '../types';
import { getItem, ITEMS_BY_KIND } from '../data';
import { validateTray } from '../sim/validate';
import { gpuHourAnchor, scaleOutTier } from '../sim/market';
import { offerAt } from '../store';
import { usd } from './common';

const Bar = ({ v, max, warn }: { v: number; max: number; warn?: boolean }) => <div className="bar" style={{ margin: '3px 0' }}><div style={{ width: `${Math.min(100, (v / Math.max(1e-9, max)) * 100)}%`, background: v > max ? 'var(--rd)' : warn || v > max * .85 ? 'var(--am)' : 'var(--gr)' }} /></div>;
const Row = ({ ok, children }: { ok: boolean | null; children: any }) => <div style={{ fontSize: 12, display: 'flex', gap: 6 }}><span className={ok === null ? 'dim' : ok ? 'pos' : 'neg'}>{ok === null ? '·' : ok ? '✓' : '✗'}</span><span>{children}</span></div>;

/** Teaches how to size PSUs, NICs, CPUs and memory for a tray, and what it costs per GPU-hour over its life. */
export default function TraySizing({ design, month, utility }: { design: TrayDesign; month: number; utility: number }) {
  const ch = getItem(design.chassisId) as Chassis | undefined; if (!ch) return null;
  const v = validateTray(design, getItem); const year = 2020 + month / 12;
  const parts = design.parts.map(p => ({ ...p, it: getItem(p.itemId)! })).filter(p => p.it);
  const n = (k: string) => parts.filter(p => p.it.kind === k).reduce((a, p) => a + p.count, 0);
  const gpus = v.stats.accels || 0;
  const draw = v.stats.watts + ch.overheadW;
  const psus = parts.filter(p => p.slot === 'psu');
  const psuW = psus.reduce((a, p) => a + ((p.it as any).capacityKW ?? 0) * 1000 * p.count, 0), psuCount = psus.reduce((a, p) => a + p.count, 0);
  const unitW = psuCount ? psuW / psuCount : 0, need = unitW ? Math.ceil(draw / (unitW * 0.9)) : 0;
  const redundantOK = psuCount >= 2 && psuW - unitW >= draw * 0.9;
  const cpu = parts.find(p => p.it.kind === 'cpu'); const cpuItem = cpu?.it as Cpu | undefined; const cpuN = cpu?.count ?? 0;
  const lanesAvail = Math.min(ch.pcieLanesAvail, (cpuItem?.pcieLanes ?? 0) * cpuN || ch.pcieLanesAvail);
  const dimms = n('memory'); const channels = (cpuItem?.memChannels ?? 0) * cpuN;
  const nics = parts.filter(p => p.it.kind === 'nic'); const nicGbps = nics.reduce((a, p) => a + (p.it as Nic).gbps * p.count, 0);
  const perGpu = gpus ? nicGbps / 8 / gpus : 0, tier = scaleOutTier(year);
  const bestNic = ITEMS_BY_KIND('nic').filter(x => x.nicClass === 'nic' && offerAt(x, month).available).sort((a, b) => b.gbps - a.gbps)[0];
  const nicNeed = bestNic && gpus ? Math.ceil((tier * 8 * gpus) / bestNic.gbps) : 0;
  const hbm = v.stats.memGB, hostRam = parts.filter(p => p.it.kind === 'memory').reduce((a, p) => a + (p.it as any).capacityGB * p.count, 0);
  // TCO
  const capex = v.stats.costUSD; const powerMo = (draw / 1000) * 1.3 * 730 * utility; const hours = 5 * 8760;
  const costHr = gpus ? (capex / hours + (powerMo * 12 * 5) / hours) / gpus : 0;
  const price = gpuHourAnchor(year);
  const cpuOpts = ITEMS_BY_KIND('cpu').filter(c => offerAt(c, month).available && c.arch === (cpuItem?.arch ?? 'x86')).sort((a, b) => b.availableFrom - a.availableFrom).slice(0, 1);
  const hint = (cpuOpts[0] as Cpu | undefined);
  return <div style={{ display: 'grid', gap: 10 }}>
    <div><b style={{ fontSize: 12 }}>⚡ Power supplies</b><Bar v={draw} max={psuW || 1} />
      <div className="mono" style={{ fontSize: 11 }}>draw {(draw / 1000).toFixed(1)} kW · PSU capacity {(psuW / 1000).toFixed(1)} kW ({psuCount} × {(unitW / 1000).toFixed(1)} kW) · chassis limit {(ch.maxPowerW / 1000).toFixed(1)} kW</div>
      <Row ok={psuW >= draw}>Capacity covers the {gpus || '0'}-GPU draw{psuW < draw ? ` — add PSUs` : ''}</Row>
      <Row ok={redundantOK}>N+1 redundancy: one PSU can fail without a brownout{!redundantOK && unitW ? ` — need ≥ ${need + 1} PSUs (you have ${psuCount})` : ''}</Row>
      <Row ok={draw <= ch.maxPowerW}>Within the chassis busbar limit</Row></div>
    <div><b style={{ fontSize: 12 }}>🔌 PCIe lanes & CPUs</b><Bar v={v.stats.pcieLanesUsed} max={lanesAvail || ch.pcieLanesAvail} />
      <div className="mono" style={{ fontSize: 11 }}>{v.stats.pcieLanesUsed}/{lanesAvail || ch.pcieLanesAvail} lanes used · {cpuN} CPU{cpuN === 1 ? '' : 's'} × {cpuItem?.pcieLanes ?? 0} lanes</div>
      <Row ok={v.stats.pcieLanesUsed <= (lanesAvail || ch.pcieLanesAvail)}>{cpuN <= 1 ? 'One CPU gives half the lanes of two — fine for 4 GPUs/NVMe-light trays, starved for 8 GPUs + 8 NICs.' : cpuN === 2 ? 'Two CPUs: the standard 8-GPU layout — each CPU feeds half the GPUs/NICs, UPI link between them.' : 'Four CPUs: only worth it for huge memory or lane counts; cost and power go up.'}</Row>
      {hint && <div className="dim" style={{ fontSize: 11 }}>1 CPU = {hint.pcieLanes} lanes · {hint.memChannels} mem channels · {hint.tdpW} W · {usd(hint.priceUSD)} ({hint.name}). Cheaper CPUs cut cost but may cut lanes/channels.</div>}</div>
    <div><b style={{ fontSize: 12 }}>🌐 NICs (scale-out)</b>
      <div className="mono" style={{ fontSize: 11 }}>{nics.reduce((a, p) => a + p.count, 0)} NICs = {nicGbps} Gbps → <b>{perGpu.toFixed(1)} GB/s per GPU</b> · training customers expect ≥ {tier.toFixed(1)} GB/s in {Math.floor(year)}</div>
      <Row ok={perGpu >= tier * 0.98}>{perGpu >= tier * 0.98 ? 'Meets today’s training bandwidth tier.' : `Short of the tier — ${bestNic ? `need ~${nicNeed} × ${bestNic.name} (${bestNic.gbps}G, x${bestNic.pcieLanes} lanes each)` : 'newer NICs'} for ${gpus} GPUs. Inference-only trays can get away with less.`}</Row>
      <Row ok={null}>Rule of thumb: one NIC per GPU ("rail-optimized") for training; one per 2 GPUs is fine for inference.</Row></div>
    <div><b style={{ fontSize: 12 }}>🧠 Memory & storage</b>
      <div className="mono" style={{ fontSize: 11 }}>{dimms} DIMMs on {channels || '?'} channels · host RAM {hostRam} GB vs {hbm} GB of GPU HBM</div>
      <Row ok={!channels || dimms >= channels}>{!channels || dimms >= channels ? 'All memory channels populated (full host bandwidth).' : `Only ${dimms}/${channels} channels populated — host bandwidth is wasted.`}</Row>
      <Row ok={hostRam >= hbm * 0.5 || !hbm}>Host RAM ≥ ~½ of HBM keeps checkpointing and data loading smooth.</Row></div>
    <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 8 }}><b style={{ fontSize: 12 }}>💰 Cost over a long contract (5-year TCO)</b>
      <div className="grid g2" style={{ marginTop: 4 }}><div className="stat"><small>Capex / GPU</small><b style={{ fontSize: 17 }}>{gpus ? usd(capex / gpus) : '—'}</b></div><div className="stat"><small>Power / GPU / month</small><b style={{ fontSize: 17 }}>{gpus ? usd(powerMo / gpus) : '—'}</b></div>
        <div className="stat"><small>Break-even $/GPU-hr (100% used)</small><b style={{ fontSize: 17 }}>{gpus ? `$${costHr.toFixed(2)}` : '—'}</b></div><div className="stat"><small>Break-even at 60% used</small><b style={{ fontSize: 17 }}>{gpus ? `$${(costHr / 0.6).toFixed(2)}` : '—'}</b></div></div>
      <Row ok={gpus ? costHr / 0.6 < price : null}>Market pays ≈ ${price.toFixed(2)}/GPU-hr this year{gpus ? (costHr / 0.6 < price ? ` — a ${Math.round((1 - costHr / 0.6 / price) * 100)}% margin at 60% utilisation.` : ' — this tray does not break even at 60% use; cut cost or raise utilisation.') : '.'}</Row>
      <div className="dim" style={{ fontSize: 11 }}>To lower cost for a long contract: drop unneeded NICs/NVMe/CPUs, keep PSU count at N+1 (not more), choose the GPU with the best price per HBM-GB for inference or per PFLOP for training.</div></div>
  </div>;
}
