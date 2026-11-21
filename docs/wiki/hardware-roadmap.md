# Hardware roadmap

*Keynotes, pre-orders, lead times and allocation — knowing what ships next decides when you buy, build and sell.*

Silicon is announced at keynotes months before it ships. The game fires keynotes on their real calendar dates — GTC (spring), Computex (May/June), SC (November), OCP, and AMD's Advancing AI events — and each one pauses the clock with a **keynote card** explaining the technology, what it changes in your hall, and the one thing to remember. The **Roadmap tab** in Procurement lists every past keynote with a *Read the keynote* button and shows the next one coming.

## Pre-orders and allocation

After a keynote, announced parts become **pre-orderable**:

- Pre-orders open at the keynote, never earlier than 12 months before the ship date
- You pay a **launch premium** and queue **behind the hyperscalers**; delivery lands after the ship date
- **Cancelling refunds most of what you paid** — a pre-order is a cheap option on supply
- Even regular orders of hot parts carry **per-quarter allocation caps**; vendor relationships and frameworks raise your allocation (see [Money and operations](money-and-operations.md))

If you wait instead, you pay the going rate and stand in the queue with everyone else — hot generations sell out before they ship.

## The shape of the campaign

A few beats worth planning around (dates as they land in-game):

- **GTC 2021 — Grace.** A roadmap keynote: an Arm CPU built to sit next to GPUs over NVLink-C2C. Nothing to buy for years; note the direction.
- **GTC 2022 — Hopper H100.** FP8 Transformer Engine, NVLink 4 at 900 GB/s between GPUs, ~3.35 TB/s HBM3, 700 W per SXM GPU — an 8-GPU node is ~10 kW. A GPU generation is a power and cooling project first and a chip purchase second.
- **2023 — GH200, Spectrum-X, MI300X, H200.** Memory becomes the story: MI300X brings 192 GB of HBM3, and H200 shows that when a workload is memory-bound, faster memory is worth more than faster math. Ethernet becomes a real alternative to InfiniBand for scale-out.
- **GTC 2024 — Blackwell.** GB200 NVL72 links 72 GPUs into one liquid-cooled ~120 kW rack (NVLink 5 at 1.8 TB/s per GPU). Air-cooled halls cannot host it at all; the floor needs a CDU loop.
- **Computex 2024 — the yearly cadence.** All vendors move to annual generations. Everything you buy depreciates faster; resale timing becomes part of the business model.
- **GTC 2025 — Blackwell Ultra, Vera Rubin roadmap.** GB300 drops into GB200-class racks: same ~120 kW, so the hall you built keeps working. Rubin racks will draw considerably more — plan bigger feeds and CDUs early.
- **Oct 2025 — Vera Rubin orders open.** Longer queues than any prior generation; earlier-generation prices soften as buyers wait. Sell older racks while residual value holds.
- **GTC 2026 — Rubin Ultra, 102.4 Tb/s switches.** 576-GPU NVLink domains; bigger switch silicon means fewer tiers and hops per GPU.

## Budget cards: RTX and other PCIe GPUs

Not every rack needs a flagship. PCIe cards fit ordinary servers, run on air and arrive in a month or two.

| Card | Ships | Memory | Notes |
|---|---|---|---|
| GeForce RTX 3090 | late 2020 | 24 GB | cheapest compute of its year |
| RTX A6000 | late 2020 | 48 GB | workstation card: ECC memory, blower cooler |
| GeForce RTX 4090 | late 2022 | 24 GB | close to L40S compute at a fifth of the price |
| RTX 6000 Ada | late 2022 | 48 GB | an L40S a year early |
| L40S | late 2023 | 48 GB | the standard budget server card |
| GeForce RTX 5090 | early 2025 | 32 GB | 575 W each; supports FP4 |
| RTX PRO 6000 Blackwell | 2025 | 96 GB | most memory per dollar |

The GeForce cards are consumer parts: no ECC memory and coolers built for a desktop case, so in a packed server they deliver less than the spec sheet says. The game models that as lower efficiency, not as a ban. With 24 to 32 GB each they also cannot hold large models, and with no fast link between cards a model split across several of them runs slowly. They suit small inference contracts. Training contracts need GPUs linked in groups of eight or more, which no PCIe card can do.

## When to buy

- **Plan the building two generations ahead.** Racks change yearly; power and cooling plants last decades. Buy transformers and CDU capacity for the rack that ships next, not the one shipping today.
- **Pre-order at the keynote when the part changes your market** — e.g. a rack format that unlocks contracts you can't serve — and treat the cancellation loss as the price of a place in the queue.
- **Sell into strength.** When a generation lands, its predecessor becomes a discounted workhorse: reassign it to inference or spot, or sell it while residual value is real.
- **Watch the calendar beats.** The 2023 demand shock slashes allocation and slips in-transit GPU orders; later, vendors reward operators with demonstrated deployments — a campus that ships on schedule gets first call on the next generation.

The Codex's **accelerator timeline** view shows every generation with memory, bandwidth, power and scale-up — the fastest way to compare what to buy.

Related: [Hardware lifecycle](money-and-operations.md) · [Servers and racks](servers-and-racks.md) · [Power and cooling](power-and-cooling.md).
