import type { GameStore } from '../api';
import type { Ctx } from './ctx';
import { procureActions } from './procure';
import { designActions } from './design';
import { facilityActions } from './facility';
import { deployActions } from './deploy';
import { clustersActions } from './clusters';
import { contractsActions } from './contracts';
import { financeActions } from './finance';
import { energyActions } from './energy';
import { sessionActions } from './session';

/** Every player action, grouped by domain. Add a domain here and the bridge/env pick it up. */
export const DOMAINS = {
  procure: procureActions, design: designActions, facility: facilityActions, deploy: deployActions,
  clusters: clustersActions, contracts: contractsActions, finance: financeActions, energy: energyActions, session: sessionActions,
} as const;

export const composeActions = (c: Ctx): Omit<GameStore, 'game'> =>
  Object.assign({}, ...Object.values(DOMAINS).map((f) => f(c))) as Omit<GameStore, 'game'>;
