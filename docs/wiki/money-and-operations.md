# Money and operations

*Cash, loans and interest, depreciation, staffing, hardware lifecycle and resale — everything on the Operations screen.*

The core equation, visible in the top bar (revenue, burn and net per month): **revenue − burn = net**, where burn is power + staff + support + interest, and the net figure is stated after depreciation. Utilization is everything — an idle rack earns nothing while it still draws power and depreciates. **Net worth = cash − debt + assets at residual value**: only profitable months compound, borrowed scale does not.

## Cash, loans and bankruptcy

Loans land in cash instantly and interest accrues monthly; the credit limit grows with your installed assets. Repay in chunks or all at once when cash allows — interest is a silent burn line, so gear up for builds, not for idle balances.

**Three consecutive months of negative cash is bankruptcy** and the campaign ends with your creditors closing you down. The *Next month* preview on the Overview screen shows cash after next month and your runway at the current burn — check it before every big order. Learner mode cannot go bankrupt.

## Team

Racks don't run themselves. The staffing rule: **one ops technician per 10 online racks**, plus a **liquid-cooling specialist** once a DLC/immersion hall has online racks, plus a **network engineer per 1,024 clustered accelerators** — a skeleton crew of one even when empty. Understaffing multiplies failure rates and slows repairs; the screen shows the exact effect. Hire ahead of the fleet, not after it: a failed rack costs far more than an early hire.

## Operating policy

Two dials with real trade-offs:

- **Burn-in** — how long racks soak before going live. Skipping it ships dead GPUs; longer soak catches more failures at the price of extra months of lead time.
- **Maintenance** — reactive (no fee), preventive, or premium. Higher tiers cut failure rates for a monthly per-rack fee.

## Hardware lifecycle and resale

The lifecycle table lists every rack with its age, its accelerator, its **residual value** percentage and a sale price — sorted worst-first, with advice per rack. GPUs lose value to successor generations faster than to wear: under the yearly cadence, resale timing is part of the business model. Sell while residual value is real; a rack must be unclustered first, and quick-sale pays less than residual value as the convenience discount. The Learning path has a mission for your first decommissioned rack, because a fleet that never refreshes ends up running hardware no customer wants.

## Clearing stock

Leftover parts in the warehouse can be sold from *Clear warehouse stock* at a discount to list. Useful after design changes and cancelled builds; don't let a stale inventory become a junk drawer.

## Vendor relationships and frameworks

Buying from a vendor builds a **relationship**: better allocation multipliers on constrained parts and relationship pricing. **Frameworks** go further — commit to a spend over a set term for a discount on that vendor's parts, with a deposit paid up front. A framework that expires with its commitment unmet costs a penalty on the shortfall. Frameworks matter most when a hot generation is allocation-constrained (see [Hardware roadmap](hardware-roadmap.md)).

## Market competition

The Operations screen tracks rival operators: their share, their fleet size, and whether they price above or below list. When rivals undercut, incoming offers are priced down; when your scale commands the market, offers are priced up. The price index tells you which world you're in.

Related: [Customers and contracts](customers-and-contracts.md) for the revenue side, [Energy and the spot market](energy-and-spot.md) for one of the largest burn lines.
