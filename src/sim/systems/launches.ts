import { LAUNCHES, shipMonthOf } from '../../data/launches';
import { getItem } from '../../data';
import type { System } from './types';

/** Keynotes fire on their calendar month (queued for the UI to show) and parts announced earlier log when they start shipping. */
export const launchesSystem: System = {
  id: 'launches',
  run: ({ s, log }) => {
    for (const l of LAUNCHES) {
      if (l.month !== s.month) continue;
      s.launchesSeen = [...(s.launchesSeen ?? []), l.id];
      s.news = [...(s.news ?? []), l.id];
      log('info', `📣 ${l.venue}: ${l.headline}`);
    }
    for (const l of LAUNCHES) {
      if (l.month >= s.month) continue;
      const shipping = l.items.map((id) => getItem(id)).filter((it) => it && shipMonthOf(it) === s.month);
      if (shipping.length) log('good', `📦 Now shipping: ${shipping.map((it) => it!.name).join(', ')} (announced at ${l.venue}). Pre-orders are delivered first; everyone else orders at the going rate.`);
    }
  },
};
