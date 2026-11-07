# Energy and the spot market

*PPAs and take-or-pay power, the spot utility rate, and selling idle GPU capacity hour by hour.*

Power is one of your largest operating costs, and your [PUE](power-and-cooling.md) sets how much of it goes to overhead. The Energy screen (Facility drawer → Energy tab) manages both sides: what you pay for electricity and what idle hardware earns while it waits for a contract.

## The power position

The top panel shows your facility draw in MW against your committed contracts. With no contracts, you buy 100% at the **spot utility rate**, which mean-reverts toward a baseline but spikes during energy-crisis events — sometimes painfully. The projected monthly bill and blended rate tell you what your halls actually cost to run.

## PPAs — take-or-pay power

A **power purchase agreement** is a long contract to buy fixed MW from a plant at a fixed price, paid whether you use the power or not. Plant offers arrive most months from grid, solar, gas, hydro and nuclear sources, and each card shows:

- **Price** vs the current spot rate
- **Firmness** — the share of months the plant actually delivers (a supplier failure means curtailment or fallback to spot)
- **Oversubscription limit** — you may draw above your commit up to a limit, billed at an overage multiple; beyond that, you're back on spot
- **Take-or-pay** — the fixed monthly bill for the committed MW; unused surplus is resold at a discount

PPAs are cheaper than spot and hedge price spikes, but they punish over-commitment: signing a big block before your load exists means paying for unused megawatts. Size contracts to your steady, predictable draw and let spot cover the peaks. The screen does the arithmetic for you — each offer shows how much cheaper or dearer than spot it would be at today's load, and it warns you outright when nothing is drawing yet.

## The spot GPU market

The flip side: a floating **spot price per GPU-hour**, driven by market demand (the fill rate). When demand spikes, idle clusters earn well; when it crashes, they barely cover power. You can:

- **Offer individual racks** — no cluster needed; tick them on the Energy screen or from the rack inspector in the hall. They earn while waiting for a contract.
- **Offer whole clusters** — a cluster serving no contract can earn on spot.
- **Set a reserve price** — you never sell below your floor.

A rack on spot leaves the market automatically once a contract takes it. Spot is **pre-emptible**: committed contracts always win, so treat spot as a bridge, not a business model. The Codex's *spot vs reserved* concept nags you when online racks are idle and not on spot — idle GPUs still cost power and depreciation.

## How they fit together

A balanced position looks like: a PPA (or two) covering your contracted baseline load, spot power absorbing the peaks, and every idle rack offered on the spot market until a customer signs. When an energy crisis hits the utility rate, the PPA block is the part of your bill that doesn't move — that's the hedge working. When a viral model launch floods inference demand, spot is where idle memory-rich GPUs pay off.

Related: [Customers and contracts](customers-and-contracts.md) for the reserved side, [Incidents and resilience](incidents-and-resilience.md) for crisis events, [Strategy tips](strategy-tips.md).
