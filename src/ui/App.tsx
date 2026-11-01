import { useEffect, useRef, useState } from 'react';
import { useGame, hasSave, selectNetWorth } from '../store';
import { MISSIONS } from '../missions';
import { dateOf, usd } from './common';
import Dashboard from './Dashboard';
import Shop from './Shop';
import Codex from './Codex';
import Designer from './Designer';
import Facility from './Facility';
import Network from './Network';
import Contracts from './Contracts';
import Advisor from './Advisor';
import Inventory from './Inventory';
import Energy from './Energy';
import Guide from './Guide';
import { sfx, setMuted, isMuted } from './sfx';
import { seedDemo } from './demo';
import './styles.css';

const SCREENS = [
  ['dash', '🏢', 'Datacenter', Dashboard], ['shop', '🛒', 'Procure', Shop], ['design', '🛠', 'Design Lab', Designer],
  ['facility', '🏗', 'Build', Facility], ['stock', '📦', 'Warehouse', Inventory], ['energy', '⚡', 'Energy', Energy], ['network', '🖥', 'Supercomputer', Network], ['contracts', '🤝', 'Customers', Contracts], ['codex', '📖', 'Codex', Codex],
] as const;

function Count({ v, fmt }: { v: number; fmt: (n: number) => string }) {
  const [d, setD] = useState(v); const ref = useRef(v);
  useEffect(() => { const from = ref.current, t0 = performance.now(); let raf = 0; const step = (t: number) => { const k = Math.min(1, (t - t0) / 600); const e = 1 - Math.pow(1 - k, 3); ref.current = from + (v - from) * e; setD(ref.current); if (k < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf); }, [v]);
  return <>{fmt(d)}</>;
}

export default function App() {
  const g = useGame(s => s.game);
  const h = typeof location !== 'undefined' ? location.hash.slice(1).split('/') : [];
  const [started, setStarted] = useState(() => { if (h[0] === 'demo') { seedDemo(); return true; } if (h[0] === 'play') { useGame.getState().newGame(42); return true; } return false; });
  const [scr, setScr] = useState<string>(h[1] || 'dash');
  const [learn, setLearn] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; level: string }[]>([]);
  const [auto, setAuto] = useState(false);
  const [guide, setGuide] = useState(false);
  useEffect(() => { if (started) { try { if (!localStorage.getItem('gw-guide-seen') && !h[0]) { setGuide(true); localStorage.setItem('gw-guide-seen', '1'); } } catch { /* ignore */ } } }, [started]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return; const n = +e.key; if (n >= 1 && n <= SCREENS.length) setScr(SCREENS[n - 1][0]); if (e.key === ' ') { e.preventDefault(); useGame.getState().nextMonth(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const [banner, setBanner] = useState<string | null>(null);
  const [delta, setDelta] = useState<{ id: number; v: number } | null>(null);
  const lastCash = useRef<number | null>(null);
  const seen = useRef(0);
  const T = useRef(0);

  useEffect(() => { // toasts from the log
    const fresh = g.log.slice(seen.current);
    if (!started) { seen.current = g.log.length; return; }
    seen.current = g.log.length;
    fresh.filter(l => l.level !== 'info').slice(-3).forEach(l => { const id = ++T.current; setToasts(t => [...t.slice(-4), { id, text: l.text, level: l.level }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000); });
  }, [g.log.length, started]);

  useEffect(() => { // mission rewards
    for (const m of MISSIONS) if (!g.missionsDone.includes(m.id) && m.done(g)) {
      sfx('quest'); setBanner(m.title); setTimeout(() => setBanner(null), 3200);
      useGame.setState(s => ({ game: { ...s.game, cash: s.game.cash + m.reward, missionsDone: [...s.game.missionsDone, m.id], log: [...s.game.log, { month: s.game.month, level: 'good', text: `★ Mission complete: ${m.title} (+${usd(m.reward)}). ${m.lesson}` }] } }));
      break;
    }
  }, [g]);

  useEffect(() => { if (lastCash.current !== null && Math.abs(g.cash - lastCash.current) > 1000 && started) { setDelta({ id: Date.now(), v: g.cash - lastCash.current }); setTimeout(() => setDelta(null), 2200); } lastCash.current = g.cash; }, [g.month]);
  useEffect(() => { if (!auto) return; const t = setInterval(() => useGame.getState().nextMonth(), 1200); return () => clearInterval(t); }, [auto]);

  if (!started) return <div className="hero"><div>
    <div className="dim" style={{ letterSpacing: '.4em', marginBottom: 14 }}>AI DATACENTER TYCOON</div>
    <h1>GIGA<b style={{ color: 'var(--cy)' }}>WATT</b></h1>
    <p className="dim" style={{ maxWidth: 560, margin: '18px auto 28px' }}>Buy real GPUs. Design trays, racks and fabrics. Wire power and liquid cooling. Lease capacity for training and inference — and learn the whole AI hardware stack by surviving it. 2020 → 2028.</p>
    <div className="modecards">
      {([['learner', '🎓', 'Learner', 'I don’t know what a chiller is.', '$80M · explainers on every screen · “Do it for me” Easy path · live “do I need this?” datacenter 101'], ['operator', '🛠', 'Operator', 'I know the basics.', '$50M · guided planner and checklists · you do the steps, the game checks them'], ['tycoon', '💼', 'Tycoon', 'Just give me the keys.', '$30M · no hand-holding · you handle the whole stack']] as const).map(([m, ic, n, q, d]) =>
        <div key={m} className="modecard" onClick={() => { useGame.getState().newGame(Date.now() % 100000, m); setStarted(true); }}><div className="ic">{ic}</div><b>{n}</b><div style={{ color: 'var(--cy)', fontSize: 13 }}>{q}</div><div className="dim" style={{ fontSize: 13, marginTop: 6 }}>{d}</div></div>)}</div>
    {hasSave() && <button className="btn" style={{ padding: '12px 24px' }} onClick={() => { useGame.getState().load(); setStarted(true); }}>CONTINUE</button>}
  </div></div>;

  const Cur = (SCREENS.find(s => s[0] === scr) ?? SCREENS[0])[3] as any;
  const nw = selectNetWorth(g);
  const next = () => { sfx('month'); useGame.getState().nextMonth(); };
  const questsReady = MISSIONS.filter(m => !g.missionsDone.includes(m.id)).length;
  return <div className="app">
    <div className="top">
      <div className="logo">GIGA<b>WATT</b></div>
      <div className="datechip"><small>{['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][g.month % 12]}</small><b>{2020 + Math.floor(g.month / 12)}</b></div>
      <div className="pill cash"><i>💵</i><span className={g.cash < 0 ? 'neg' : ''}><Count v={g.cash} fmt={usd} /></span>{delta && <em key={delta.id} className={'float ' + (delta.v >= 0 ? 'pos' : 'neg')}>{delta.v >= 0 ? '+' : ''}{usd(delta.v)}</em>}</div>
      {g.debt > 0 && <div className="pill"><i>🏦</i><span className="warn">{usd(g.debt)}</span></div>}
      <div className="pill"><i>📈</i><span><Count v={nw} fmt={usd} /></span></div>
      <div className="pill"><i>⭐</i><span>{g.reputation.toFixed(0)}</span></div>
      <div className="sp" />
      <button className="btn sm" title="Change help level" onClick={() => useGame.getState().setMode((g.mode === 'learner' ? 'operator' : g.mode === 'operator' ? 'tycoon' : 'learner'))}>{g.mode === 'learner' ? '🎓 Learner' : g.mode === 'tycoon' ? '💼 Tycoon' : '🛠 Operator'}</button>
      <button className="btn sm" title="How to play" onClick={() => setGuide(true)}>❓ How to play</button>
      <button className="btn sm" title="Sound" onClick={() => { setMuted(!isMuted()); setAuto(a => a); }}>{isMuted() ? '🔇' : '🔊'}</button>
      <button className="btn sm" onClick={() => useGame.getState().save()}>💾</button>
      <button className={'btn' + (auto ? ' pri' : '')} onClick={() => setAuto(a => !a)}>{auto ? '❚❚' : '▶▶'}</button>
      <button className="btn go bigbtn" onClick={next}>NEXT MONTH ▶</button>
    </div>
    <div className="screen"><Cur go={setScr} setLearn={(id: string | null) => { setLearn(id); if (id) setScr('codex'); }} learn={learn} /></div>
    <Advisor g={g} go={setScr} scr={scr} />
    <div className="dock">{SCREENS.map(([id, ic, name], n) => <button key={id} className={'tile' + (scr === id ? ' on' : '')} onClick={() => { setScr(id); sfx('tick'); }}><span className="ic">{ic}</span><span>{name}</span><kbd>{n + 1}</kbd>{id === 'dash' && questsReady > 0 && <em className="badge">{questsReady}</em>}{id === 'contracts' && g.availableContracts.length > 0 && <em className="badge">{g.availableContracts.length}</em>}</button>)}</div>
    {guide && <Guide g={g} go={setScr} onClose={() => setGuide(false)} />}
    {banner && <div className="banner"><small>★ MISSION COMPLETE ★</small><b>{banner}</b></div>}
    <div className="toasts">{toasts.map(t => <div key={t.id} className={'toast ' + t.level}>{t.text}</div>)}</div>
  </div>;
}
