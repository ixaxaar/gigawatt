import { POWER_SOURCES, spotAnchor } from '../../sim/power';
import { CoolingClass, ValidationIssue } from '../../types';
import { ActionResult } from '../api';

export const POWER_LESSON = Object.fromEntries(Object.entries(POWER_SOURCES).map(([k, v]) => [k, v.lesson])) as Record<string, string>;
void spotAnchor;
export const SAVE_KEY = 'gigawatt-save-v1';

export const ok = (message = '', issues?: ValidationIssue[]): ActionResult => ({ ok: true, message, issues });
export const fail = (message: string, issues?: ValidationIssue[]): ActionResult => ({ ok: false, message, issues });

export const usd = (n: number): string => Math.round(n).toLocaleString('en-US');

export const COOL_LEVEL: Record<CoolingClass, number> = { air: 0, rdhx: 1, dlc: 2, immersion: 3 };

export const POWER_FEED_TYPES = [
  'transformer', 'ups', 'busway', 'power-shelf', 'solar-ppa', 'gas-turbine',
];

