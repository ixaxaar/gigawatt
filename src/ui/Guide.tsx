import type { GameState } from '../types';

export default function Guide({ g, go, onClose }: { g: GameState; go: (s: string) => void; onClose: () => void }) {
  const placed = g.halls.flatMap(h => h.racks);
  const hasAccel = Object.keys(g.inventory).length > 0 || g.orders.length > 0 || placed.length > 0;
  const steps: { t: string; d: string; done: boolean; to: string; btn: string }[] = [
    { t: 'Find a customer', d: 'Open Customers. Every offer says what it needs and whether your current capacity can serve it. Green = ready now. Amber/red = open “What you need to buy” — it lists concrete builds (cheapest, fastest, best payback) with a tick-list of which customer requirements each one meets. Press 🟢 EASY PATH and the game signs, orders, installs plant, deploys, builds the fabric and assigns — you just press Next Month.', done: g.activeContracts.length > 0, to: 'contracts', btn: 'Customers' },
    { t: 'Sign — or order first', d: 'You can SIGN NOW and deploy later: you get a ramp window (months) to bring capacity online, no revenue and no SLA clock until then, and the customer walks if you miss it. Safe rule: only sign if the build’s “ready” date is inside the window.', done: g.activeContracts.length > 0, to: 'contracts', btn: 'Customers' },
    { t: 'Order the hardware', d: 'Click ORDER in the plan, or use Procure ▸ guided planner. Parts take months to arrive (GPUs longest). OEM/turnkey racks cost more but arrive faster and come pre-validated.', done: hasAccel, to: 'shop', btn: 'Procure' },
    { t: 'Prepare the hall', d: 'Racks need power, cooling and floor space BEFORE they go in. Build ▸ buy transformers/UPS (power) and CRAH/CDU/RDHx (cooling) and install them. Liquid racks (≥ 40 kW) need a liquid-cooled hall.', done: g.halls.some(h => h.coolingKW > 600 || h.racks.length > 0), to: 'facility', btn: 'Build' },
    { t: 'Deploy racks', d: 'When parts arrive they sit in the Warehouse. Warehouse ▸ pick the rack design ▸ DEPLOY. Missing parts? “Order all missing” buys exactly what is short.', done: placed.length > 0, to: 'stock', btn: 'Warehouse' },
    { t: 'Wait for commissioning', d: 'Press NEXT MONTH (or Space). Racks spend ~2 months installing and burn-in; a few fail and need repair.', done: placed.some(p => p.status === 'online'), to: 'dash', btn: 'Datacenter' },
    { t: 'Join racks into a cluster', d: 'Network ▸ select online racks and a fabric (InfiniBand / Ethernet). Training contracts need one coherent cluster big enough for the model; inference needs enough tokens/s.', done: g.clusters.length > 0, to: 'network', btn: 'Network' },
    { t: 'Assign it and earn', d: 'Customers ▸ ASSIGN & GO LIVE. Revenue starts the next month. Watch SLA availability — failures cost money.', done: g.activeContracts.some(a => a.clusterIds.length > 0), to: 'contracts', btn: 'Customers' },
    { t: 'Optimise', d: 'Energy: sign PPAs (cheaper power, take-or-pay) and sell idle GPUs on the spot market. Go liquid-cooled, add halls, take loans carefully, keep reputation up for bigger customers.', done: (g.powerContracts?.length ?? 0) > 0, to: 'energy', btn: 'Energy' },
  ];
  const now = steps.findIndex(s => !s.done);
  return <div className="guide" onClick={onClose}><div className="box" onClick={e => e.stopPropagation()}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2 style={{ margin: 0, flex: 1 }}>How to play GIGAWATT</h2><button className="btn" onClick={onClose}>✕ Close</button></div>
    <p className="dim">You run an AI datacenter. Customers pay for GPU time (training) or tokens/s (inference). Everything below is the loop — the highlighted step is where you are now.</p>
    <div className="grid g2" style={{ margin: '10px 0 14px' }}>
      <div className="panel"><h3>🎯 Contract-first (safe)</h3><div className="dim" style={{ fontSize: 13 }}>Pick an offer → open “What you need to buy” → order that build → sign (or sign first if the ramp window is longer than the build time). You never own idle hardware, but you only win offers you can build in time. Good for the first 1–2 years.</div></div>
      <div className="panel"><h3>🏗 Build-first (speculative)</h3><div className="dim" style={{ fontSize: 13 }}>Order and deploy capacity ahead of demand, make a cluster, and meanwhile sell idle GPUs on the spot market (Energy ▸ spot). When a good contract appears you can serve it immediately. Higher capex and risk, higher payoff once reputation grows.</div></div></div>
    {steps.map((s, i) => <div key={s.t} className={'gstep' + (s.done ? ' done' : i === now ? ' now' : '')}>
      <div className="n">{s.done ? '✓' : i + 1}</div><div><b>{s.t}</b><div className="dim" style={{ fontSize: 12.5 }}>{s.d}</div></div>
      <button className={'btn sm' + (i === now ? ' go' : '')} onClick={() => { go(s.to); onClose(); }}>{s.btn} →</button></div>)}
    <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>Timing cheat-sheet: GPU lead 3–9 months · install + burn-in 2 months · cluster + assign 1 month. A first contract with a 4-month ramp is only reachable if you already own parts or buy fast OEM racks.</div>
  </div></div>;
}
