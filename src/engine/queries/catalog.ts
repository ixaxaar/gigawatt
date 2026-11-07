// Read-only engine queries — catalog. (Pure functions of the current game; exposed through the bridge.)
import { ALL_ITEMS, getItem } from '../../data';
import { TEMPLATES } from '../../data/templates';
import { racksFor, templateBom, templateFacts } from '../../plan';
import { hallChecks, quote } from '../../quote';
import { offerAt, volumeDiscount } from '../../store';
import { G, tpl } from './shared';

export const catalogQueries: Record<string, (...a: any[]) => any> = {
  offer: (itemId) => { const it = getItem(itemId); return it ? offerAt(it, G().month, true) : null; },
  offersAll: () => Object.fromEntries(ALL_ITEMS.map(i => [i.id, offerAt(i, G().month, true)])),
  volumeDiscount: (itemId, n, unit) => volumeDiscount(getItem(itemId)!, n, unit),
  quote: (tid, racks) => quote(tpl(tid), racks, G().month, true),
  hallChecks: (tid, racks) => hallChecks(G(), tpl(tid), racks),
  templateFacts: (tid) => templateFacts(tpl(tid)),
  templatesAll: () => TEMPLATES.map(t => ({ ...templateFacts(t), id: t.id, racksFor1: 1, quote1: quote(t, 1, G().month, true) })),
  templateBom: (tid, racks) => templateBom(tpl(tid), racks),
  racksFor: (tid, n) => racksFor(tpl(tid), n),
};
