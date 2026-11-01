import type { CatalogItem } from '../types';
import { NVIDIA_ACCELERATORS, NVIDIA_CPUS } from './nvidia';
import { OTHER_ACCELERATORS, OTHER_CPUS } from './other-accel';
import { NICS, CABLES } from './network';
import { SWITCHES } from './network-switches';
import { CHASSIS, RACKS, STORAGE_SYSTEMS, MEMORY, NVME, VENDORS as BASE_VENDORS } from './facility-chassis';
import { POWER, COOLING } from './facility-power';
import { ERA_CPUS, ERA_NVME, ERA_ACCELERATORS, ERA_NICS, ERA_SWITCHES, ERA_MEMORY, ERA_STORAGE, ERA_CPUS_EXTRA, ERA_BLACKWELL, ERA_RACKS } from './era2020';

import { EXP2_POWER, EXP2_COOLING, EXP2_UPLINKS, EXP2_VENDORS } from './expansion2';
import { EXP_ACCELERATORS, EXP_CPUS, EXP_NICS, EXP_SWITCHES, EXP_POWER, EXP_COOLING, EXP_STORAGE, EXP_MEMORY, EXP_NVME } from './expansion';

export const VENDORS = [...BASE_VENDORS, ...EXP2_VENDORS];
export const ALL_ITEMS: CatalogItem[] = [
  ...NVIDIA_ACCELERATORS, ...NVIDIA_CPUS, ...OTHER_ACCELERATORS, ...OTHER_CPUS,
  ...NICS, ...CABLES, ...SWITCHES, ...CHASSIS, ...RACKS, ...STORAGE_SYSTEMS,
  ...MEMORY, ...NVME, ...ERA_CPUS, ...ERA_NVME, ...ERA_ACCELERATORS, ...ERA_NICS, ...ERA_SWITCHES, ...ERA_MEMORY, ...ERA_STORAGE, ...ERA_CPUS_EXTRA, ...ERA_BLACKWELL, ...ERA_RACKS, ...POWER, ...COOLING,
  ...EXP_ACCELERATORS, ...EXP_CPUS, ...EXP_NICS, ...EXP_SWITCHES, ...EXP_POWER, ...EXP_COOLING, ...EXP_STORAGE, ...EXP_MEMORY, ...EXP_NVME, ...EXP2_POWER, ...EXP2_COOLING, ...EXP2_UPLINKS,
];
const BY_ID = new Map<string, CatalogItem>(ALL_ITEMS.map(i => [i.id, i]));
export const getItem = (id: string) => BY_ID.get(id);
export const ITEMS_BY_KIND = <K extends CatalogItem['kind']>(k: K) =>
  ALL_ITEMS.filter((i): i is Extract<CatalogItem, { kind: K }> => i.kind === k);
export const duplicateIds = () => ALL_ITEMS.map(i => i.id).filter((id, n, a) => a.indexOf(id) !== n);
