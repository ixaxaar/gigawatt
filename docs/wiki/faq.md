# FAQ

*Fifteen questions every operator asks sooner or later.*

**1. Which mode should I pick?**
Pick **Learner** if a chiller is a mystery — it adds explainers everywhere, and you can't go bankrupt. **Operator** is the intended experience with the guided planner and checklists. **Tycoon** strips the help. You can cycle modes any time from the top bar. The Easy Path ("do it for me") is available in every mode.

**2. Do I need to know hardware to play?**
No. The tutorial walks you from first customer to first revenue, the Learning path pays you to learn each system, and the in-game Codex explains every concept and part with a live "do I need this right now?" verdict. Start with [Your first hour](first-hour.md).

**3. How do I actually make money?**
Sign contracts, deploy hardware that meets their checks in time, and keep utilization high. Revenue minus power, staff, support, depreciation and interest is profit. Idle GPUs on the spot market cover part of their own cost while they wait.

**4. Why does my order take months to arrive?**
Everything has a lead time, hot GPUs have per-quarter allocation caps, and shocks can slip in-transit orders further. Order ahead of need; missions teach this first for a reason. See [Hardware roadmap](hardware-roadmap.md).

**5. Why can't I place my rack?**
A deploy needs every part of the design in the warehouse, plus hall power, cooling headroom and a free slot. The Warehouse and Build screens list exactly what's missing — use *order all missing*.

**6. What is commissioning / burn-in?**
The soak period after installation: power-on, firmware, burn-in tests. It catches dead GPUs and optics before customers do. Its length is a policy you set in Operations — skipping it ships dead silicon.

**7. Air or liquid cooling?**
Air works to roughly 20–25 kW per rack, rear-door heat exchangers stretch toward 40 kW, and direct-to-chip liquid (with CDUs) is required beyond that — GB200 NVL72-class racks (~120 kW) are liquid-only. See [Power and cooling](power-and-cooling.md).

**8. What is PUE and why should I care?**
Total facility power ÷ IT power. You pay the overhead every month, so efficient cooling directly cuts your power bill — especially with [PPAs](energy-and-spot.md) pricing every MWh.

**9. Training or inference contracts?**
Whatever your hardware fits. Training pays by the GPU-hour and demands scale-up domains and fabric bandwidth; inference pays per token and rewards memory capacity and bandwidth. A balanced book of both rides out demand cycles.

**10. What oversubscription should I pick?**
1:1 for training clusters (congestion slows collectives), 2–4:1 for inference (much cheaper, rarely missed). The Supercomputer screen's auto-design buttons pick sensibly for you. See [Networking and clusters](networking-and-clusters.md).

**11. Should I sign a PPA?**
Usually yes, sized to your steady load: it hedges energy-crisis spikes. But take-or-pay means you buy the committed MW even when idle, so don't over-commit before the load exists. See [Energy and the spot market](energy-and-spot.md).

**12. My contract says "awaiting deployment" — what now?**
You signed; the ramp window (about four months) is ticking. Build/buy the hardware, cluster it on the Supercomputer screen, then assign the cluster — or serve straight from racks for inference. Miss the window and the customer walks with a reputation hit. See [Customers and contracts](customers-and-contracts.md).

**13. A rack failed — why, and how do I fix it fast?**
Parts fail at a steady rate. A spare on the shelf swaps in within about a month; without one, the vendor RMA takes roughly four. Check the spares table on the Warehouse and keep it at the advised level. See [Incidents and resilience](incidents-and-resilience.md).

**14. When should I sell old racks?**
When residual value is still real — typically as the successor generation lands and demand shifts to it. The Operations lifecycle table sorts worst-first and advises per rack. Sell while the hardware is still a discounted workhorse, not a paperweight.

**15. How does the campaign end?**
December 2028 brings a scored report: rating, net worth, lifetime revenue, peak accelerators, contracts completed, reputation. Alternatively, three consecutive months of negative cash ends everything early in bankruptcy (Learner mode excepted). See [Money and operations](money-and-operations.md).

Still stuck? The [Glossary](glossary.md) defines the words, and the in-game Codex explains every part.
