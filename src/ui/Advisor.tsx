import { useEffect, useState } from 'react';
import type { GameState } from '../types';
import { MISSIONS } from '../missions';

export default function Advisor({ g, go, scr }: { g: GameState; go: (s: string) => void; scr: string }) {
  const [open, setOpen] = useState(true);
  const m = MISSIONS.find(x => !g.missionsDone.includes(x.id));
  useEffect(() => { setOpen(true); const t = setTimeout(() => setOpen(false), 10000); return () => clearTimeout(t); }, [m?.id]);
  const warn = g.cash < 2_000_000 ? 'Cash is critically low. Land a contract or take a loan before ordering more.' : null;
  const text = warn ?? (m ? m.hint : 'You have mastered the core loop. Scale up, go liquid-cooled, and chase bigger contracts.');
  const coolInInv = Object.keys(g.inventory).some(id => /crah|cdu|rdhx|chiller|dry|immersion|loop/i.test(id));
  const step: Record<string, string> = {
    cool: coolInInv ? 'Build ▸ “Install equipment from inventory” ▸ Install 1.' : 'Build ▸ “Buy plant for this hall” ▸ Buy 1 CRAH, wait for delivery, then Install it.',
    place: 'Warehouse ▸ pick a rack design ▸ if parts are missing, “Order all missing”; when complete press DEPLOY.',
    contract: 'Customers ▸ check the green/amber/red verdict ▸ SIGN.',
  };
  const here = m && scr === m.go;
  return <div className="advisor">
    {open && <div className="bubble"><div className="who">ADA · Infra Lead</div>{m && !warn && <b>{m.title}</b>}<div>{text}</div>
      {m && !warn && <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>💡 {m.lesson}</div>}
      {m && step[m.id] && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--cy)' }}>▶ {step[m.id]}</div>}
      {m && !here && <button className="btn sm go" style={{ marginTop: 6 }} onClick={() => go(m.go)}>Take me there →</button>}
      {m && here && <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>You're already on the right screen.</div>}</div>}
    <div className="avatar" onClick={() => setOpen(o => !o)} title="Toggle advisor">{!open && m && <em className="badge" style={{ right: -2, top: -2 }}>!</em>}<svg viewBox="0 0 60 60" width="50" height="50"><circle cx="30" cy="30" r="29" fill="#10202f" stroke="#4fd1ff" strokeWidth="2" />
      <path d="M12 52c2-12 10-16 18-16s16 4 18 16" fill="#1b86b0" /><circle cx="30" cy="25" r="11" fill="#f2c9a0" /><path d="M18 24c0-10 8-14 14-13s11 5 10 13c-3-5-8-7-12-7s-9 2-12 7z" fill="#2a1a12" /><rect x="19" y="23" width="22" height="7" rx="3" fill="#0b121c" opacity=".85" /><circle cx="25" cy="26.5" r="1.6" fill="#4fd1ff" /><circle cx="35" cy="26.5" r="1.6" fill="#4fd1ff" /><path d="M26 33q4 3 8 0" stroke="#7a3b2a" strokeWidth="1.5" fill="none" /></svg></div>
  </div>;
}
