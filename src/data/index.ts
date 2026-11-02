import type { CatalogItem } from '../types';
import { NVIDIA_ACCELERATORS, NVIDIA_CPUS } from './nvidia';
import { OTHER_ACCELERATORS, OTHER_CPUS } from './other-accel';
import { NICS, CABLES } from './network';
import { SWITCHES } from './network-switches';
import { CHASSIS, RACKS, STORAGE_SYSTEMS, MEMORY, NVME, VENDORS as BASE_VENDORS } from './facility-chassis';
import { POWER, COOLING } from './facility-power';
import { ERA_CPUS, ERA_NVME, ERA_ACCELERATORS, ERA_NICS, ERA_SWITCHES, ERA_MEMORY, ERA_STORAGE, ERA_CPUS_EXTRA, ERA_BLACKWELL, ERA_RACKS } from './era2020';

import { CAT_POWER, CAT_POWER_VENDORS } from './cat-power';
import { CAT_STORAGE_SYSTEMS, CAT_MEMORY, CAT_NVME, CAT_RACKS, CAT_STORAGE_VENDORS } from './cat-storage';
import { OEM_VENDORS } from './oem-vendors';
import { CAT_COOLING, CAT_COOLING_VENDORS } from './cat-cooling';
import { EXP2_POWER, EXP2_COOLING, EXP2_UPLINKS, EXP2_VENDORS } from './expansion2';
import { EXP_ACCELERATORS, EXP_CPUS, EXP_NICS, EXP_SWITCHES, EXP_POWER, EXP_COOLING, EXP_STORAGE, EXP_MEMORY, EXP_NVME } from './expansion';

const _v = [...BASE_VENDORS, ...EXP2_VENDORS, ...CAT_POWER_VENDORS, ...CAT_STORAGE_VENDORS, ...OEM_VENDORS, ...CAT_COOLING_VENDORS];
export const VENDORS = _v.filter((x, i) => _v.findIndex(y => y.id === x.id) === i);
export const ALL_ITEMS: CatalogItem[] = [
  ...NVIDIA_ACCELERATORS, ...NVIDIA_CPUS, ...OTHER_ACCELERATORS, ...OTHER_CPUS,
  ...NICS, ...CABLES, ...SWITCHES, ...CHASSIS, ...RACKS, ...STORAGE_SYSTEMS,
  ...MEMORY, ...NVME, ...ERA_CPUS, ...ERA_NVME, ...ERA_ACCELERATORS, ...ERA_NICS, ...ERA_SWITCHES, ...ERA_MEMORY, ...ERA_STORAGE, ...ERA_CPUS_EXTRA, ...ERA_BLACKWELL, ...ERA_RACKS, ...POWER, ...COOLING,
  ...EXP_ACCELERATORS, ...EXP_CPUS, ...EXP_NICS, ...EXP_SWITCHES, ...EXP_POWER, ...EXP_COOLING, ...EXP_STORAGE, ...EXP_MEMORY, ...EXP_NVME, ...EXP2_POWER, ...EXP2_COOLING, ...EXP2_UPLINKS,
  ...CAT_POWER, ...CAT_COOLING, ...CAT_STORAGE_SYSTEMS, ...CAT_MEMORY, ...CAT_NVME, ...CAT_RACKS,
];
const BY_ID = new Map<string, CatalogItem>(ALL_ITEMS.map(i => [i.id, i]));
export const getItem = (id: string) => BY_ID.get(id);
export const ITEMS_BY_KIND = <K extends CatalogItem['kind']>(k: K) =>
  ALL_ITEMS.filter((i): i is Extract<CatalogItem, { kind: K }> => i.kind === k);
export const duplicateIds = () => ALL_ITEMS.map(i => i.id).filter((id, n, a) => a.indexOf(id) !== n);
