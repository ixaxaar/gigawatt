import type { ReactNode } from 'react';
import type { CatalogItem, Codex, ValidationIssue } from '../types';
import { getItem } from '../data';

export const usd = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  return a >= 1e9 ? `${s}$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${s}$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${s}$${(a / 1e3).toFixed(1)}k` : `${s}$${a.toFixed(0)}`;
};
export const num = (n: number, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
export const dateOf = (m: number) => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m % 12]} ${2020 + Math.floor(m / 12)}`;

export function Panel({ title, children, right, glow, cls }: { title?: string; children: ReactNode; right?: ReactNode; glow?: boolean; cls?: string }) {
  return <div className={'panel' + (glow ? ' glow' : '') + (cls ? ' ' + cls : '')}>{(title || right) && <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{title}</h3>{right}</div>}{children}</div>;
}
export const Stat = ({ label, value, cls }: { label: string; value: ReactNode; cls?: string }) => <div className="stat"><small>{label}</small><b className={cls}>{value}</b></div>;

export function Issues({ issues, onLearn }: { issues: ValidationIssue[]; onLearn?: (id: string) => void }) {
  if (!issues.length) return <div className="issue info"><div><b>All clear</b>No problems detected.</div></div>;
  const order = { error: 0, warn: 1, info: 2 };
  return <>{[...issues].sort((a, b) => order[a.severity] - order[b.severity]).map((i, n) => (
    <div key={n} className={'issue ' + i.severity}><div><b>{i.severity} · {i.code}</b>{i.message}
      {i.learn && onLearn && getItem(i.learn) && <> <a style={{ color: 'var(--cy)', cursor: 'pointer' }} onClick={() => onLearn(i.learn!)}>learn →</a></>}</div></div>))}</>;
}

export function CodexCard({ codex, name }: { codex: Codex; name?: string }) {
  return <div className="codex">{name && <b>{name}</b>}<p>{codex.summary}</p><p className="dim">{codex.explain}</p>
    <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{codex.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>
    {codex.tags?.map(t => <span className="tag" key={t}>{t}</span>)}</div>;
}

export function specsOf(i: CatalogItem): [string, string][] {
  switch (i.kind) {
    case 'accelerator': return [['Memory', `${i.memGB} GB ${i.memType.toUpperCase()}`], ['Mem BW', `${i.memBWTBs} TB/s`], ['FP8', `${i.tflops.fp8 ?? '–'} TF`], ['BF16', `${i.tflops.bf16 ?? '–'} TF`], ['TDP', `${i.tdpW} W`], ['Scale-up', `${i.scaleUp} ${i.scaleUpGBs} GB/s ×${i.maxScaleUpDomain}`], ['Scale-out', `${i.nativeScaleOutGbps} Gb/s`], ['Cooling', i.cooling.join('/')]];
    case 'cpu': return [['Cores', `${i.cores} ${i.arch}`], ['TDP', `${i.tdpW} W`], ['Mem BW', `${i.memBWGBs} GB/s`], ['PCIe', `Gen${i.pcieGen} ×${i.pcieLanes}`]];
    case 'nic': return [['Class', i.nicClass], ['Rate', `${i.gbps} Gb/s ×${i.ports}`], ['Power', `${i.watts} W`], ['Features', i.features.slice(0, 4).join(', ')]];
    case 'switch': return [['Role', i.role], ['Ports', `${i.portCount} × ${i.portGbps}G`], ['Capacity', `${i.capacityTbps} Tb/s`], ['Power', `${i.watts} W`], ['Size', `${i.rackUnits}U`]];
    case 'cable': return [['Type', i.cableType], ['Rate', `${i.gbps}G`], ['Reach', `${i.maxReachM} m`], ['Power', `${i.wattsPerEnd} W/end`]];
    case 'chassis': return [['Size', `${i.rackUnits}U ${i.rackStandard}`], ['Cooling', i.cooling], ['Max power', `${(i.maxPowerW / 1000).toFixed(1)} kW`], ['Weight', `${i.weightKg} kg`]];
    case 'rack': return [['Units', `${i.units}U`], ['Max', `${i.maxKW} kW`], ['Weight', `${i.maxWeightKg} kg`], ['Cooling', i.cooling.join('/')]];
    case 'power': return [['Type', i.powerType], ['Capacity', `${i.capacityKW} kW`], ['Efficiency', `${(i.efficiency * 100).toFixed(1)}%`], ['Install', `${i.installMonths} mo`]];
    case 'cooling': return [['Type', i.coolingType], ['Capacity', `${i.capacityKW} kW`], ['Overhead', `${i.wattsPerKW} W/kW`], ['Serves', i.serves], ['Supply', `${i.supplyTempC}°C`]];
    case 'storage': return [['Tier', i.tier], ['Capacity', `${i.capacityPB} PB`], ['Read', `${i.readGBs} GB/s`], ['Size', `${i.rackUnits}U`]];
    case 'memory': return [['Type', i.type], ['Capacity', `${i.capacityGB} GB`], ['Speed', `${i.speedMTs} MT/s`]];
    case 'nvme': return [['Capacity', `${i.capacityTB} TB`], ['Read', `${i.readGBs} GB/s`], ['PCIe', `Gen${i.pcieGen}`]];
  }
}
export const vendorColor = (v: string) => ({ nvidia: '#76b900', amd: '#ed1c24', tenstorrent: '#8a5cf6', cerebras: '#ff7a1a', intel: '#0071c5', groq: '#f5d90a' } as Record<string, string>)[v] ?? '#4fd1ff';
