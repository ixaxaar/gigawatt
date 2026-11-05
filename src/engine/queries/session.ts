// Session queries: save slots and the end-of-game report.
import { listSaves } from '../persistence';
import { G } from './shared';

export const sessionQueries: Record<string, (...a: any[]) => any> = {
  saves: () => listSaves(),
  endReport: () => ({ status: G().status ?? 'playing', report: G().endReport ?? null }),
};
