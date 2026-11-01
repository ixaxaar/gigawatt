import { it } from 'vitest';
import { mulberry32 } from './sim/rng';
const num = (x: number) => {
  let s = x.toPrecision(17); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s;
};
it('probe', () => {
  const r = mulberry32(36);
  const rolls: number[] = [];
  const rec = () => { const v = r(); rolls.push(v); return v; };
  // contract 0 (training): n=1 already drawn? no: n first
  const n = 1 + Math.floor(rec() * 3); // roll 1
  for (let i = 0; i < n; i++) {
    const slice = rec(); const model = rec(); const arch = rec(); const suffix = rec();
    const cust = rec(); const pen = rec(); const dead = rec(); const sla = rec();
    if (i === 1) {
      const rr = -0.005 + sla * 0.01;
      console.log('sla draw r =', num(sla));
      console.log('rr          =', num(rr));
      console.log('0.98 + rr   =', num(0.98 + rr));
      console.log('0.95 + rr   =', num(0.95 + rr));
    }
    const branch = rec();
    // assume same kinds as golden: c0 training, c1 enterprise(training)
    const a = rec(); const b = rec(); const c = rec();
    void slice; void model; void arch; void suffix; void cust; void pen; void dead; void branch; void a; void b; void c;
  }
  console.log('n =', n);
});
