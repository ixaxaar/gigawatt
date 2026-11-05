// Read-only engine queries — rival operators. (Pure functions of the current game; exposed through the bridge.)
import { onlineAccels } from '../../sim/rivals';
import { G } from './shared';

export const rivalsQueries: Record<string, (...a: any[]) => any> = {
  rivals: () => {
    const g = G();
    const rivals = g.rivals ?? [];
    const rivalAccels = rivals.reduce((n, r) => n + r.accels, 0);
    const mine = onlineAccels(g);
    const shareOf = (accels: number) => (mine + rivalAccels > 0 ? (accels / (mine + rivalAccels)) * 100 : 0);
    const top = [...rivals].sort((a, b) => b.accels - a.accels)[0];
    return {
      rivals: rivals.map((r) => ({
        id: r.id, name: r.name, style: r.style,
        accels: Math.round(r.accels),
        priceMult: Math.round(r.priceMult * 100) / 100,
        sharePct: Math.round(shareOf(r.accels) * 10) / 10,
      })),
      priceIndex: g.marketPriceIndex ?? 1,
      playerAccels: mine,
      playerSharePct: Math.round(shareOf(mine) * 10) / 10,
      headline: top
        ? `${top.name} runs ${Math.round(top.accels).toLocaleString('en-US')} accelerators at ${Math.round(top.priceMult * 100)}% of list pricing.`
        : 'No rival operators tracked yet.',
    };
  },
};
