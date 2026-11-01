import { useState } from 'react';
import { CONCEPTS } from '../concepts';
import { useGame } from '../store';

const COL = { now: 'var(--rd)', soon: 'var(--am)', ok: 'var(--gr)', na: 'var(--dim)' } as const;
const LBL = { now: 'YOU NEED THIS NOW', soon: 'COMING UP', ok: 'COVERED', na: 'NOT YET' } as const;

/** "Datacenter 101": every concept with a live “do I need this right now?” verdict. */
export default function Concepts({ go, only }: { go?: (s: string) => void; only?: string[] }) {
  const g = useGame(s => s.game);
  const [open, setOpen] = useState<string | null>(null);
  const list = CONCEPTS.filter(c => !only || only.includes(c.id));
  const rank = { now: 0, soon: 1, ok: 2, na: 3 } as const;
  const rows = list.map(c => ({ c, s: c.status(g) })).sort((a, b) => rank[a.s.level] - rank[b.s.level]);
  return <div style={{ display: 'grid', gap: 6 }}>{rows.map(({ c, s }) => <div key={c.id} className="concept" style={{ borderColor: s.level === 'now' ? COL.now : undefined }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(open === c.id ? null : c.id)}>
      <span style={{ fontSize: 20 }}>{c.icon}</span><div style={{ flex: 1 }}><b>{c.name}</b><div style={{ fontSize: 11.5, color: COL[s.level] }}>{s.text}</div></div>
      <span className="tag" style={{ color: COL[s.level], borderColor: COL[s.level] }}>{LBL[s.level]}</span></div>
    {open === c.id && <div style={{ fontSize: 12.5, marginTop: 6, display: 'grid', gap: 4 }}><div><b>What it is:</b> {c.what}</div><div><b>Why you care:</b> {c.why}</div><div><b>When you need it:</b> {c.when}</div>{c.go && go && <button className="btn sm" onClick={() => go(c.go!)}>Take me there →</button>}</div>}
  </div>)}</div>;
}
