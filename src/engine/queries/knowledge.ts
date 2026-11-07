// Read-only engine queries — knowledge. (Pure functions of the current game; exposed through the bridge.)
import { CONCEPTS, INCIDENT_CONCEPTS } from '../../concepts';
import { MISSIONS } from '../../missions';
import { MODELS, gpuHourAnchor, scaleOutTier } from '../../sim/market';
import { getItem } from '../../data';
import { LAUNCHES, preorderOpens, shipMonthOf } from '../../data/launches';
import { G } from './shared';

export const knowledgeQueries: Record<string, (...a: any[]) => any> = {
  /** The keynote calendar with live status, plus the pending keynote cards. */
  launches: () => {
    const g = G();
    const list = LAUNCHES.map(l => {
      const items = l.items.map(id => getItem(id)).filter(Boolean).map(it => {
        const ships = shipMonthOf(it!), opens = preorderOpens(it!) ?? ships;
        return { id: it!.id, name: it!.name, vendor: it!.vendor, ships, opens, state: g.month >= ships ? 'shipping' : g.month >= opens ? 'preorder' : 'announced' };
      });
      const status = g.month < l.month ? 'upcoming' : items.length && items.every(i => i.state === 'shipping') ? 'shipped' : items.some(i => i.state === 'preorder') ? 'preorder' : items.length ? 'announced' : 'past';
      return { ...l, items, status };
    });
    return { list, news: (g.news ?? []).map(id => list.find(l => l.id === id)).filter(Boolean) };
  },
  models: () => { const y = 2020 + G().month / 12; return { all: MODELS, tier: scaleOutTier(y), anchor: gpuHourAnchor(y) }; },
  concepts: () => [...CONCEPTS, ...INCIDENT_CONCEPTS].map(c => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go, status: c.status(G()) })),
  missions: () => MISSIONS.map(m => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go, done: m.done(G()) })),
};
