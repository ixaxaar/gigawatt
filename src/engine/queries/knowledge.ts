// Read-only engine queries — knowledge. (Pure functions of the current game; exposed through the bridge.)
import { CONCEPTS } from '../../concepts';
import { MISSIONS } from '../../missions';
import { MODELS, gpuHourAnchor, scaleOutTier } from '../../sim/market';
import { G } from './shared';

export const knowledgeQueries: Record<string, (...a: any[]) => any> = {
  models: () => { const y = 2020 + G().month / 12; return { all: MODELS, tier: scaleOutTier(y), anchor: gpuHourAnchor(y) }; },
  concepts: () => CONCEPTS.map(c => ({ id: c.id, icon: c.icon, name: c.name, what: c.what, why: c.why, when: c.when, go: c.go, status: c.status(G()) })),
  missions: () => MISSIONS.map(m => ({ id: m.id, title: m.title, hint: m.hint, lesson: m.lesson, reward: m.reward, go: m.go, done: m.done(G()) })),
};
