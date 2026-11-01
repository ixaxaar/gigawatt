// Realism expansion 2: brand-name generators, chillers, power redundancy, internet circuits.
import type { PowerEquip, CoolingEquip, Uplink, VendorInfo, Vendor, CatalogBase } from '../types';

type Cx = [string, string, string[]];
const cdx = ([summary, explain, tradeoffs]: Cx): CatalogBase['codex'] => ({ summary, explain, tradeoffs, tags: ['expansion'] });
const base = (id: string, name: string, vendor: Vendor, from: number, price: number, lead: number, c: Cx) =>
  ({ id, name, vendor, availableFrom: from, priceUSD: price, leadTimeMonths: lead, codex: cdx(c) });
const pw = (o: Omit<PowerEquip, 'kind'>): PowerEquip => ({ kind: 'power', ...o });
const co = (o: Omit<CoolingEquip, 'kind'>): CoolingEquip => ({ kind: 'cooling', ...o });
const gen = (id: string, name: string, v: Vendor, price: number, kw: number, lead: number, c: Cx, from = 2020) =>
  pw({ ...base(id, name, v, from, price, lead, c), powerType: id.startsWith('bloom') ? 'gas-turbine' : 'genset', capacityKW: kw, efficiency: 0.96, installMonths: 3 });

export const EXP2_POWER: PowerEquip[] = [
  gen('cat-3516-2500', 'Caterpillar 3516 Diesel Genset (2.5 MW)', 'caterpillar', 920000, 2500, 6, ['Cat 3516: the classic 2.5 MW data-centre diesel standby set.', 'Caterpillar dominates datacenter standby power: Cat 3500-series sets start in about 10 seconds and take full load in one step. You need fuel storage, emissions permits and monthly load tests.', ['Proven, fast start, strong dealer service', 'Diesel permits and fuel logistics']]),
  gen('cat-c175-3000', 'Caterpillar C175-16 Diesel Genset (3 MW)', 'caterpillar', 1150000, 3000, 7, ['Cat C175-16: 3 MW Tier-2 diesel set for large halls.', 'More power per engine means fewer sets and a simpler paralleling plant.', ['Fewer engines to parallel', 'Long lead time']], 2021),
  gen('cat-g3520-gas-2500', 'Caterpillar G3520 Natural-Gas Genset (2.5 MW)', 'caterpillar', 1400000, 2500, 8, ['Gas-fired prime-power set: no diesel tank, can run continuously.', 'Gas sets can run as on-site prime power and sell flexibility to the grid; they depend on pipeline gas, so a gas outage is a power outage unless you hold diesel too.', ['Continuous duty and lower emissions', 'Depends on gas pipeline']], 2021),
  gen('cummins-qsk95-3500', 'Cummins QSK95 Diesel Genset (3.5 MW)', 'cummins', 1250000, 3500, 7, ['Cummins QSK95: 3.5 MW high-speed diesel set.', 'Cummins is the main alternative to Cat. Price and lead time vary by quarter; mixing brands complicates spares and training.', ['Competitive price', 'Mixed fleets mean mixed spares']], 2021),
  gen('mtu-20v4000-2750', 'MTU 20V4000 Diesel Genset (2.75 MW)', 'mtu', 1180000, 2750, 7, ['Rolls-Royce MTU 20V4000: a dense 2.75 MW standby set.', 'MTU sets are popular in hyperscale builds and are available in rated-for-data-centre 10-second-start versions.', ['Compact for its rating', 'Smaller dealer network']]),
  gen('kohler-kd2500', 'Kohler KD2500 Diesel Genset (2.5 MW)', 'kohler', 870000, 2500, 5, ['Kohler KD2500: lower-cost 2.5 MW set with shorter lead time.', 'Often the cheapest and quickest to receive; you trade some dealer depth.', ['Lower price, faster delivery', 'Less aftermarket support']]),
  gen('bloom-es5-300', 'Bloom Energy Server (300 kW SOFC fuel cell)', 'bloom', 1350000, 300, 6, ['Solid-oxide fuel cell running on natural gas, no combustion.', 'Bloom boxes give always-on on-site power with no diesel and quiet running. Cost per kW is high but they avoid grid interconnection waits.', ['Bypasses grid queue', 'High $/kW']], 2021),
  pw({ ...base('abb-paralleling-4000', 'Paralleling Switchgear (4 MW, ATS-integrated)', 'abb', 2020, 260000, 5, ['Synchronises several generators onto one bus and transfers load automatically.', 'With more than one genset you need paralleling gear. It also gives N+1: lose one engine and the others still carry the hall.', ['Enables N+1 genset plants', 'Complex controls, a single bus']]),
    powerType: 'switchgear', capacityKW: 4000, efficiency: 0.998, installMonths: 3 }),
  pw({ ...base('gen-utility-feed-b', 'Second utility feed (diverse substation)', 'generic', 2020, 900000, 12, ['A second grid connection from a different substation.', 'Most real outages are grid faults. A diverse second feed turns them into a non-event but takes a year of utility engineering.', ['Cuts outage frequency sharply', 'Long lead time and big upfront fee']]),
    powerType: 'switchgear', capacityKW: 5000, efficiency: 0.999, installMonths: 6 }),
  pw({ ...base('piller-rotary-1500', 'Rotary Flywheel UPS (1.5 MW, diesel-ready)', 'generic', 2020, 520000, 6, ['Rotary UPS: a spinning flywheel carries load until the generator starts.', 'No batteries to replace; ride-through is only 10-15 seconds, so it requires a generator that starts reliably.', ['No battery maintenance', 'Short ride-through']]),
    powerType: 'ups', capacityKW: 1500, efficiency: 0.975, installMonths: 3 }),
  pw({ ...base('siemens-mv-swgr-6000', 'Siemens MV Switchgear (6 MW)', 'siemens', 2021, 340000, 5, ['Medium-voltage switchgear for large halls.', 'Large sites distribute at MV and step down near the load; this is the breaker line-up that makes it safe to maintain.', ['Needed past ~5 MW', 'Long lead time']]),
    powerType: 'switchgear', capacityKW: 6000, efficiency: 0.998, installMonths: 3 }),
  pw({ ...base('et-padmount-10000', 'Eaton 10 MVA MV Pad-Mount Transformer', 'eaton', 2021, 410000, 9, ['10 MVA transformer for multi-hall campuses.', 'Transformers are the longest-lead item in power; order early.', ['One unit powers four halls', 'Lead time over a year in tight markets']]),
    powerType: 'transformer', capacityKW: 9000, efficiency: 0.99, installMonths: 4 }),
];

const chill = (id: string, name: string, v: Vendor, price: number, kw: number, wpk: number, serves: CoolingEquip['serves'], temp: number, lead: number, c: Cx, from = 2020) =>
  co({ ...base(id, name, v, from, price, lead, c), coolingType: 'chiller', capacityKW: kw, wattsPerKW: wpk, serves, supplyTempC: temp, installMonths: 2 });
export const EXP2_COOLING: CoolingEquip[] = [
  chill('trane-rtac-700', 'Trane RTAC Air-Cooled Chiller (700 kW)', 'trane', 190000, 700, 280, 'air', 10, 4, ['Trane Series R air-cooled screw chiller.', 'Compact and reliable. Efficiency collapses in heat waves; water-cooled plants do better at scale.', ['Simple, no tower', 'Poor hot-day efficiency']]),
  chill('carrier-30xf-1000', 'Carrier AquaForce 30XF (1 MW)', 'carrier', 290000, 1000, 240, 'air', 10, 4, ['Carrier AquaForce air-cooled chiller with VFD compressors.', 'Variable-speed compressors track load, saving energy at part load, which is where datacenters run most hours.', ['Good part-load efficiency', 'Capex above fixed-speed units']]),
  chill('jci-york-yvaa-1100', 'Johnson Controls YORK YVAA (1.1 MW)', 'jci', 330000, 1100, 230, 'air', 10, 5, ['YORK YVAA free-cooling-capable air chiller.', 'Adds a free-cooling coil so cold weather needs no compressors.', ['Seasonal free cooling', 'Climate-dependent savings']]),
  chill('trane-centravac-2500', 'Trane CenTraVac Water-Cooled Chiller (2.5 MW)', 'trane', 780000, 2500, 150, 'air', 8, 8, ['Magnetic-bearing centrifugal chiller on a cooling-tower loop.', 'The efficiency leader for big halls, but it needs a tower, pumps and makeup water.', ['Best kW per ton at scale', 'Water, tower and pumps']], 2021),
  chill('daikin-wmc-1500', 'Daikin Magnitude Oil-Free Chiller (1.5 MW)', 'daikin', 540000, 1500, 160, 'air', 8, 6, ['Oil-free magnetic-bearing centrifugal chiller.', 'No oil means less maintenance and better part-load efficiency.', ['Low maintenance, great part load', 'Higher price']], 2021),
  chill('trane-dlc-trim-1200', 'Trane Warm-Water Trim Chiller (1.2 MW, DLC)', 'trane', 360000, 1200, 90, 'dlc', 32, 5, ['Trim chiller for warm-water liquid cooling loops.', 'Liquid-cooled racks accept 30 C water, so the chiller only trims on the hottest days. Energy per kW removed falls dramatically.', ['Excellent for DLC', 'Useless for air-cooled halls']], 2023),
  chill('carrier-dlc-trim-2000', 'Carrier AquaEdge Trim Chiller (2 MW, DLC)', 'carrier', 520000, 2000, 85, 'dlc', 32, 6, ['Large warm-water trim chiller for liquid-cooled halls.', 'Pairs with dry coolers for most-year free cooling.', ['Low PUE', 'DLC only']], 2023),
];

const up = (id: string, name: string, price: number, mrc: number, gbps: number, carrier: Uplink['carrier'], service: Uplink['service'], lead: number, c: Cx, from = 2020): Uplink =>
  ({ kind: 'uplink', ...base(id, name, 'generic', from, price, lead, c), gbps, mrcUSD: mrc, carrier, service });
export const EXP2_UPLINKS: Uplink[] = [
  up('transit-10g-a', '10G IP transit (carrier A)', 4000, 3500, 10, 'carrier-a', 'transit', 1, ['10 Gb/s Tier-1 IP transit.', 'Enough to start a small inference business. Billed monthly; build-out takes weeks.', ['Cheap to start', 'Single carrier means a single fiber-cut risk']]),
  up('transit-100g-a', '100G IP transit (carrier A)', 25000, 22000, 100, 'carrier-a', 'transit', 3, ['100 Gb/s IP transit.', 'Serves mid-size inference fleets and dataset ingestion for training.', ['Price per Gb/s drops with size', 'Still a single carrier']]),
  up('transit-100g-b', '100G IP transit (carrier B, diverse path)', 25000, 24000, 100, 'carrier-b', 'transit', 3, ['A second 100G circuit from a different carrier on a different fiber route.', 'Two carriers on diverse paths mean a backhoe cut does not take you offline.', ['Survives a fiber cut', 'Pay twice for the same capacity']]),
  up('transit-400g-a', '400G IP transit (carrier A)', 90000, 70000, 400, 'carrier-a', 'transit', 5, ['400 Gb/s IP transit.', 'For large inference fleets and multi-petabyte dataset pulls.', ['Cheapest per Gb/s', 'Large commitment']], 2022),
  up('transit-400g-c', '400G IP transit (carrier C, diverse path)', 90000, 76000, 400, 'carrier-c', 'transit', 5, ['400G from a third carrier for diversity.', 'The second leg of a redundant internet edge.', ['Redundancy', 'Cost']], 2022),
  up('ixp-peering-100g', '100G IX peering port', 15000, 6000, 100, 'ixp', 'peering', 4, ['Peering at an Internet Exchange.', 'Swaps traffic directly with eyeball networks and clouds at a fraction of transit cost; needs a presence in an exchange facility.', ['Very cheap per Gb/s', 'Only reaches networks that peer']]),
  up('cloud-onramp-100g', '100G cloud on-ramp (Direct Connect-style)', 40000, 30000, 100, 'cloud', 'cloud-onramp', 4, ['Private link to a hyperscaler cloud.', 'Enterprises and labs pull datasets and serve results through their cloud; a private on-ramp avoids the public internet.', ['Low jitter, predictable', 'Expensive per Gb/s']], 2021),
  up('dark-fiber-campus', 'Dark fiber pair to a carrier hotel', 180000, 12000, 800, 'carrier-b', 'dark-fiber', 8, ['Leased dark fiber you light yourself.', 'Gives huge capacity for a flat fee but you buy the optics and own the failure domain.', ['Cheapest at hyperscale', 'You operate it']], 2021),
];

const v = (id: Vendor, name: string, sells: VendorInfo['sells'], summary: string): VendorInfo => ({
  id, name, sells, reliability: 0.93, support: 0.9, volumeDiscountPerDoublingPct: 3,
  codex: { summary, explain: `${name} supplies datacenter infrastructure. Compare lead time, service coverage and spares logistics, not just price.`, tradeoffs: ['Strong service network', 'Price varies by quarter'] },
});
export const EXP2_VENDORS: VendorInfo[] = [
  v('caterpillar', 'Caterpillar', ['power'], 'Leading maker of datacenter standby generators (Cat 3500 and C175 series).'),
  v('cummins', 'Cummins', ['power'], 'Diesel and gas generator maker; the main alternative to Caterpillar.'),
  v('mtu', 'Rolls-Royce MTU', ['power'], 'German high-speed engines and gensets popular in hyperscale builds.'),
  v('kohler', 'Kohler', ['power'], 'Generator maker with competitive price and delivery.'),
  v('bloom', 'Bloom Energy', ['power'], 'Solid-oxide fuel cells for on-site datacenter power.'),
  v('abb', 'ABB', ['power'], 'Switchgear and paralleling controls.'),
  v('siemens', 'Siemens', ['power'], 'Medium-voltage switchgear and power distribution.'),
  v('trane', 'Trane', ['cooling'], 'Chillers and HVAC for large halls.'),
  v('carrier', 'Carrier', ['cooling'], 'Chillers with variable-speed compressors.'),
  v('jci', 'Johnson Controls (YORK)', ['cooling'], 'YORK chillers and building controls.'),
  v('daikin', 'Daikin Applied', ['cooling'], 'Oil-free magnetic-bearing chillers.'),
];
