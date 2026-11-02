// Server / rack-scale integrators used by system templates.
import type { VendorInfo, Vendor } from '../types';
const o = (id: Vendor, name: string, reliability: number, support: number, summary: string): VendorInfo => ({ id, name, sells: ['chassis', 'rack'], reliability, support, volumeDiscountPerDoublingPct: 3,
  codex: { summary, explain: `${name} integrates accelerators, CPUs, NICs and cooling into validated servers and racks. Compare premium, lead time, firmware support and the quality of the service contract, not just list price.`, tradeoffs: ['Validated build and one support number', 'Premium over DIY; availability tied to NVIDIA/AMD allocation'] } });
export const OEM_VENDORS: VendorInfo[] = [
  o('lenovo', 'Lenovo', 0.94, 0.92, 'ThinkSystem SR670/SR675/SR680a/SR685a AI servers with Neptune liquid cooling.'),
  o('quanta', 'Quanta Cloud Technology (QCT)', 0.93, 0.85, 'Hyperscale ODM that builds HGX servers and GB200/GB300 NVL72 racks for cloud buyers and neoclouds.'),
  o('wiwynn', 'Wiwynn', 0.93, 0.84, 'Taiwanese ODM building rack-scale GB200/GB300 NVL72 and OCP-style systems at hyperscale.'),
  o('asus', 'ASUS (ESC servers)', 0.92, 0.82, 'ESC8000/ESC N8/N-series AI servers, strong in HGX and MI300X platforms and fast to market.'),
  o('inspur', 'Inspur', 0.92, 0.8, 'Large Chinese server maker (NF5488/NF5688); sells HGX A100 generation systems internationally.'),
  o('cisco', 'Cisco UCS', 0.95, 0.94, 'UCS C885A / X-Series AI servers with Intersight management and Nexus/Silicon One networking.'),
];
