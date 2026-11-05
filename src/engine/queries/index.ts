import { designQueries } from './design';
import { catalogQueries } from './catalog';
import { facilityQueries } from './facility';
import { contractsQueries } from './contracts';
import { economyQueries } from './economy';
import { knowledgeQueries } from './knowledge';
import { lifecycleQueries } from './lifecycle';
import { staffingQueries } from './staffing';
import { sessionQueries } from './session';
import { rivalsQueries } from './rivals';
import { vendorsQueries } from './vendors';
import { previewQueries } from './preview';

const PARTS = { design: designQueries, catalog: catalogQueries, facility: facilityQueries, contracts: contractsQueries, economy: economyQueries, knowledge: knowledgeQueries, lifecycle: lifecycleQueries, staffing: staffingQueries, session: sessionQueries, rivals: rivalsQueries, vendors: vendorsQueries, preview: previewQueries };

/** All read-only queries by name; a name defined in two domains is a bug and throws at load. */
export const QUERIES: Record<string, (...a: any[]) => any> = {};
for (const [domain, qs] of Object.entries(PARTS)) for (const [name, fn] of Object.entries(qs)) {
  if (name in QUERIES) throw new Error(`duplicate query '${name}' (domain ${domain})`);
  QUERIES[name] = fn;
}
