import type { Chapter, Dilemma, RivalProfile, CustomerVoice } from './story-types';

export const CHAPTERS: Chapter[] = [
  {
    year: 2021,
    title: 'The Shortage Year',
    text: 'You open the year with a warehouse of air-cooled racks and a supply chain held together with purchase orders and optimism. Crypto miners and a pandemic chip shortage have bought up everything that resembles a GPU, and the accelerator vendor quotes delivery dates in quarters. The big cloud signs capacity you cannot afford; you build anyway, one rack at a time.',
  },
  {
    year: 2022,
    title: 'The Long Queue',
    text: 'The chip vendor announces its flagship successor, and every roadmap in the industry rearranges itself around a delivery queue measured in years. Interest rates climb, the big cloud slows its spending, and your customers start asking about commitment windows instead of capacity. You learn that patience is a line item.',
  },
  {
    year: 2023,
    title: 'The Gold Rush',
    text: 'A chatbot goes viral, and every board deck on the continent grows a slide with the words AI strategy on it. Demand arrives faster than transformers and interconnects; the fabric vendor cables are backordered like concert tickets. You are no longer selling compute; you are selling the queue for compute.',
  },
  {
    year: 2024,
    title: 'Liquid or Die',
    text: 'Racks cross the hundred-kilowatt line and air cooling formally resigns. Every serious design this year carries direct-to-chip loops, coolant distribution units, and a facilities team having quiet arguments about plumbing. Vendors who ignored liquid cooling last year are selling retrofit kits; vendors who ignored it earlier are selling whatever they can.',
  },
  {
    year: 2025,
    title: 'The Gigawatt Era',
    text: 'Campuses are measured in gigawatts, and the binding constraint is not silicon but the wire from the substation. Sovereign funds arrive with terminals full of requests and suitcases full of patience. An efficiency paper from a modest research lab halves the industry assumptions about token margins overnight; demand re-inflates by autumn anyway.',
  },
  {
    year: 2026,
    title: 'Waiting on Wires',
    text: 'The chip vendor ships its next flagship while the interconnect queue at your favorite substation grows its own waitlist. Interconnection studies run for years, power purchase agreements change hands like heirlooms, and lawyers learn to say behind-the-meter without flinching. Whoever holds electrons writes the terms.',
  },
  {
    year: 2027,
    title: 'The Price Question',
    text: 'Price per token falls faster than the cost of producing it, and resale markets fill with two-year-old accelerators priced like used sedans. Your board asks whether this is a bubble; your customers ask whether prices will keep falling; both want an answer by lunch. You keep the lights on and the answers vague.',
  },
  {
    year: 2028,
    title: 'The Last January',
    text: 'The final January of the plan opens with the industry trimming itself: mergers, quiet shutdowns, and acquisition teams circling anyone holding working capacity. The big cloud buys what it cannot build; the sovereigns buy what the big cloud will not sell. You have one year to make the ledger say what you want carved on it.',
  },
];

export const DILEMMAS: Dilemma[] = [
  {
    id: 'prepaid-exclusivity',
    fromYear: 2021,
    toYear: 2023,
    title: 'The Prepayment',
    text: 'A fast-growing model lab offers to prepay a full year of capacity, in cash, this week, if you promise those racks to nobody else. The wire would refill your tank; the lock would thin your other bids for twelve months. Your CFO has already sketched the hiring plan the deposit would cover.',
    choices: [
      {
        label: 'Take the prepay',
        outcome: 'You banked the wire the same afternoon and turned their logo into a welcome mat. Three prospects walked when word of the lock spread, but payroll stopped being a weather forecast.',
        effect: { cash: 4200000, rep: -2 },
      },
      {
        label: 'Stay open to all',
        outcome: 'You declined and spread the same racks across six smaller contracts at better blended rates. The lab signed elsewhere, and one of the small tenants grew into the account everyone else wanted.',
        effect: { rep: 3 },
      },
    ],
  },
  {
    id: 'supplier-early-allocation',
    fromYear: 2021,
    toYear: 2024,
    title: 'Allocation, Off the Books',
    text: 'A distributor regional lead calls with a whisper: several container-loads of the accelerator everyone wants, ahead of the public queue, for a priority partnership fee. The paperwork would call it a services retainer. Your ops team has been scavenging boards from returned units to keep builds moving.',
    choices: [
      {
        label: 'Pay the fee',
        outcome: 'The containers landed two quarters early and your build schedule unknotted at last. The fee stung, and an auditor later flagged the retainer as recurring and difficult to explain.',
        effect: { cash: -2500000, rep: -1 },
      },
      {
        label: 'Queue like everyone',
        outcome: 'You joined the public queue and told the distributor you preferred receipts to favors. The build slipped two quarters; the following year the same distributor sent an unsolicited discount, apparently impressed.',
        effect: { rep: 2 },
      },
    ],
  },
  {
    id: 'hydro-ppa',
    fromYear: 2023,
    toYear: 2026,
    title: 'Power for Twenty Years',
    text: 'A hydropower authority offers a twenty-year purchase agreement at a rate that would make your accountants weep with relief, if you anchor a campus in their valley. The transmission line takes two years to energize; the rate holds for twenty. Your current utility renews each winter with a smile and an escalator.',
    choices: [
      {
        label: 'Sign the long deal',
        outcome: 'You signed, and the valley campus became the steady-rate story in every fundraising deck thereafter. For two years you paid for power that arrived late; after that, you never thought about a utility bill again.',
        effect: { cash: -1000000, rep: 1, utility: 0.9 },
      },
      {
        label: 'Keep flexibility',
        outcome: 'You passed and negotiated a shorter utility extension instead, keeping the balance sheet loose for an acquisition rumor. The escalator bit a little harder each winter, but the cash and the options stayed yours.',
        effect: { utility: 1.05 },
      },
    ],
  },
  {
    id: 'viral-spike',
    fromYear: 2022,
    toYear: 2025,
    title: 'The Viral Tuesday',
    text: 'A model your tenants share goes viral on a Tuesday, and inference demand triples before the weekend. Your spot inventory could cover it, but only if you reprice hard, and three tenants are already complaining about latency. A rival sales team is cold-calling your overheated customers with polite discounts.',
    choices: [
      {
        label: 'Reprice hard',
        outcome: 'You multiplied rates while the spike lasted and retired a construction loan with a single billing cycle. Two tenants left for the rival and told the trade press their side of it.',
        effect: { cash: 3500000, rep: -4 },
      },
      {
        label: 'Hold rates',
        outcome: 'You held prices, let the queues grow, and your tenants rode the spike on your hardware with their names in the press. The rival discounters found fewer doors open than expected, and churn that quarter was zero.',
        effect: { cash: -500000, rep: 4 },
      },
    ],
  },
  {
    id: 'fire-marshal',
    fromYear: 2021,
    toYear: 2022,
    title: 'The Fire Marshal',
    text: 'The fire marshal arrives unannounced with a clipboard and a low opinion of cable trays. He points at your hot aisle, the sprinkler headroom, and a battery cabinet he describes as enthusiastic. Full remediation costs real money; a temporary variance costs a favor and a signature.',
    choices: [
      {
        label: 'Fix it properly',
        outcome: 'You spent the money, rerouted the trays, and painted clearance lines where the marshal wanted them. The inspection file closed clean, and his office later sent your other sites a courtesy checklist you actually used.',
        effect: { cash: -2200000, rep: 2 },
      },
      {
        label: 'Sign the variance',
        outcome: 'You signed the variance and the site ran untouched through the busy season. A smoldering cable event in October proved his point, though the suppression system earned its keep.',
        effect: { cash: -200000, rep: -2 },
      },
    ],
  },
  {
    id: 'poaching-offer',
    fromYear: 2022,
    toYear: 2025,
    title: 'The Counteroffer',
    text: 'Your senior reliability engineer, the one who knows which UPS phase carries which load, mentions over coffee that a rival offered a forty percent raise and a title with Principal in it. He likes it here; he also likes eating regularly. His side project is the only reason your failover works.',
    choices: [
      {
        label: 'Match most of it',
        outcome: 'You matched most of the raise and made the failover project his own line item. He stayed, rewrote the runbook, and trained two juniors who later rescued a Saturday night.',
        effect: { cash: -900000, rep: 1, staff: 1 },
      },
      {
        label: 'Wish him well',
        outcome: 'You shook his hand and told him titles age better than burnout. He left, the failover broke once during a firmware push, and the junior who fixed it earned the principal title herself.',
        effect: { rep: 1, staff: -1 },
      },
    ],
  },
  {
    id: 'data-residency',
    fromYear: 2023,
    toYear: 2026,
    title: 'The Residency Letter',
    text: 'A regulator writes to ask, in the tone of a person who already knows the answer, whether tenant data ever leaves the region during failover. Your replication was designed by someone who has since moved to Patagonia. Compliant architecture is a quarter of rebuild work; a persuasive lawyer is cheaper and slower to bet on.',
    choices: [
      {
        label: 'Rebuild in-region',
        outcome: 'You rebuilt replication inside the border and handed the regulator a diagram that survived her follow-up. Two cross-region tenants renegotiated, and the sales team started calling the compliance a feature.',
        effect: { cash: -1800000, rep: 3 },
      },
      {
        label: 'Argue the wording',
        outcome: 'Your counsel argued that ephemeral failover copies are not storage, and the regulator issued a guidance note instead of a fine. The argument held, and the wording quietly made your next cross-border expansion cheaper.',
        effect: { cash: -300000, rep: -1 },
      },
    ],
  },
  {
    id: 'crypto-miner-lease',
    fromYear: 2021,
    toYear: 2023,
    title: 'The Miner Offer',
    text: 'A mining outfit offers to lease your idle containers through the demand trough, cash monthly, with no questions about utilization graphs. Their gear is loud, their insurance is creative, and they pay in a way that clears instantly. The trough is long and your creditors are not sentimental.',
    choices: [
      {
        label: 'Lease the racks',
        outcome: 'The miners hummed through the trough and covered two quarters of fixed costs. When AI demand returned early, buying the containers back took a month and a lawyer who owed you one.',
        effect: { cash: 2400000, rep: -2 },
      },
      {
        label: 'Keep them staged',
        outcome: 'You left the containers dark and kept the cold aisles staged for tenant builds. The trough ran thinner than feared, and when a surprise contract landed you were the only vendor who could sign that week.',
        effect: { cash: -800000, rep: 2 },
      },
    ],
  },
  {
    id: 'heatwave-curtailment',
    fromYear: 2024,
    toYear: 2027,
    title: 'Four Hours of Dark',
    text: 'A heat wave parks over the region and the grid operator calls with a request dressed as a suggestion: shed a third of your load for four hours, and the brownout misses your county. Your tenants training jobs are at hour sixty of an eighty-hour run. The operator mentions the emergency-rate program for neighbors who cooperated last summer.',
    choices: [
      {
        label: 'Curtail willingly',
        outcome: 'You checkpointed the jobs and shed the load; the county lights stayed on and the evening broadcast filmed your dark roof like a monument. The operator remembered in December, when your tariff review came due.',
        effect: { cash: 600000, rep: 3, utility: 0.96 },
      },
      {
        label: 'Run through it',
        outcome: 'You ran through, the jobs finished on schedule, and the county dimmed its streetlights instead. The operator filed your name in a category of documents you never saw, and the following summer rate letter was educational.',
        effect: { cash: 1800000, rep: -2, utility: 1.07 },
      },
    ],
  },
  {
    id: 'sketchy-cash-buyer',
    fromYear: 2022,
    toYear: 2024,
    title: 'The Cash Buyer',
    text: 'A holding company with a mailbox address and a flawless wire transfer wants two full pods on a two-year term, prepaid, no site visit, no references. Their industry, when pressed, is described as logistics. Your collections team has spent the quarter chasing three honest customers for smaller sums.',
    choices: [
      {
        label: 'Take the money',
        outcome: 'The wire cleared and the pods filled; for six months they were your quietest, best-paying tenants. When their funding source vanished, the machines came back spotless and the story you told the auditors stayed boring.',
        effect: { cash: 3800000, rep: -2 },
      },
      {
        label: 'Demand references',
        outcome: 'You asked for references and the holding company evaporated by Friday. Two weeks later a rival outage made the papers with a familiar mailbox in the filings, and your deal desk framed the rejection.',
        effect: { rep: 3 },
      },
    ],
  },
  {
    id: 'pilot-rack',
    fromYear: 2021,
    toYear: 2024,
    title: 'The Pilot Rack',
    text: 'An equipment vendor sends a sales engineer with a pilot rack, free for six months, and a heavy accent on the word free. The hardware is genuinely good and the firmware phones home about everything except the weather. Your facilities lead wants it; your security lead has questions shaped like contracts.',
    choices: [
      {
        label: 'Accept the pilot',
        outcome: 'The pilot rack outperformed your installed base, and the sales engineer fixed two issues the vendor did not know they had. The conversion discount was real, and so was the telemetry clause you never quite negotiated out.',
        effect: { cash: 500000, rep: 1 },
      },
      {
        label: 'Send it back',
        outcome: 'You returned the rack and bought the same model through a competitive bid instead. The discount was smaller than free, the telemetry contract was yours, and your security lead wrote a post your customers quoted for years.',
        effect: { rep: 2 },
      },
    ],
  },
  {
    id: 'chiller-noise',
    fromYear: 2023,
    toYear: 2026,
    title: 'The Noise Complaint',
    text: 'The town council has collected forty signatures about your chillers, which sing a low B all night above a residential street. A council member suggests barriers and curfews; a neighbor suggests, at an open meeting, something less polite. Your expansion permit needs their rezoning vote in the spring.',
    choices: [
      {
        label: 'Fund the barriers',
        outcome: 'You funded the barriers and trimmed setpoints after dark; at the rezoning hearing the council president called you a neighbor. The permit passed with one dissent and a pizza order for the planning office.',
        effect: { cash: -1600000, rep: 3 },
      },
      {
        label: 'Contest the complaint',
        outcome: 'Your lawyers argued industrial zoning precedence and the complaint died in committee. The permit passed too, but the local paper ran your chillers under the headline Sound of Money, and two hires declined offers over the drive.',
        effect: { cash: -200000, rep: -2 },
      },
    ],
  },
  {
    id: 'price-fixing',
    fromYear: 2025,
    toYear: 2028,
    title: 'The Understanding',
    text: 'Over a long lunch, a rival vice president proposes an understanding: list prices move together, capacity stays off the market in soft quarters, and everyones margins heal. He calls it coordination; your counsel will call it a felony. The cash projections on his napkin are, regrettably, beautiful.',
    choices: [
      {
        label: 'Shake on it',
        outcome: 'Prices moved in lockstep for two quarters and the margin chart looked like a miracle. A subpoena arrived in the third, and the discovery archive read like his napkin with footnotes.',
        effect: { cash: 4500000, rep: -8 },
      },
      {
        label: 'Walk out',
        outcome: 'You excused yourself, briefed your counsel, and self-disclosed the lunch to the competition authority. The interview was unpleasant and the immunity was not; a thank-you note later arrived from a whistleblower inside his firm.',
        effect: { rep: 5 },
      },
    ],
  },
  {
    id: 'acquihire-ops',
    fromYear: 2025,
    toYear: 2028,
    title: 'The Ops Sale',
    text: 'A rival wants your operations lead and offers to buy her team the honest way: an acquisition of the whole ops unit, staff, runbooks, spares and all. The number would retire your debt; the catch is that your campus runs on her checklist and her memory of every breaker. The term sheet carries a non-hire clause for the region, two years long.',
    choices: [
      {
        label: 'Sell the unit',
        outcome: 'The deal closed and the balance sheet exhaled; her team left with the runbooks and a framed photo of the loading dock. The rebuilt operations desk ran at ninety-eight percent of the old reliability, on twice the invoices.',
        effect: { cash: 5500000, rep: -1, staff: -2 },
      },
      {
        label: 'Refuse and retain',
        outcome: 'You declined, promoted from within, and granted retention packages before the rival could counter. The team held through a firmware storm that would have sunk a contractor crew, and the refusal became part of your hiring pitch.',
        effect: { cash: -400000, rep: 4, staff: 1 },
      },
    ],
  },
];

export const RIVALS: RivalProfile[] = [
  {
    id: 'hyperion',
    name: 'Hyperion Cloud',
    bio: 'A hyperscaler the size of a weather system: slow to move, impossible to stop, quietly ruthless about both.',
    moves: [
      '{rival} committed another dozen campuses, most destined to open two years late and dominate for ten.',
      '{rival} posted a region-wide price cut so deep that analysts assumed it was a typo, then a strategy.',
      '{rival} hired forty capacity planners in a single week, which their blog described as routine headcount hygiene.',
      '{rival} signed a multi-gigawatt supply deal, and the supplier other customers received polite letters about their queues.',
      '{rival} suffered a four-hour regional outage and apologized in a post-mortem longer than most novels.',
      '{rival} pivoted a datacenter project toward in-house silicon, canceling enough orders to bend a supplier earnings call.',
    ],
    reactsToYou: [
      '{rival} added your company to a competitive deck, where you appeared as a small but increasingly bold square.',
      '{rival} quietly matched your headline rates in two regions, without announcing it.',
      '{rival} sent a partnership inquiry written in the tone of a museum acquiring a promising artist.',
      '{rival} told a journalist the market rewards scale, then quoted an uptime figure suspiciously close to yours.',
    ],
  },
  {
    id: 'nimbus',
    name: 'Nimbus Compute',
    bio: 'A neocloud that launches discounts the way other companies launch products: loud, loved, and one refinancing away from a cautionary tale.',
    moves: [
      '{rival} announced three regions in one post, along with a pricing table that made an accountant somewhere lie down.',
      '{rival} undercut the market again and called it a mission to democratize compute.',
      '{rival} hired a whole cluster team from a competitor, promising equity, nap pods, and unlimited cold aisle time.',
      '{rival} signed a capacity deal with a chip reseller whose warehouse, rumor says, smells like sea air.',
      '{rival} went down for a day after a cooling failure and streamed the whole incident, which viewers somehow respected.',
      '{rival} pivoted to inference hosting, then fine-tuning, then back to bare GPUs, all within a quarter.',
    ],
    reactsToYou: [
      '{rival} quoted your pricing on their homepage, undercut it by a dollar, and tagged you in the announcement.',
      '{rival} copied your liquid-cooling floor plan with the confidence of a company that has never melted a rack.',
      '{rival} courted your engineers openly, posting offer letters as content.',
      '{rival} called your margins unsustainable in an interview, recorded at a datacenter they lease by the month.',
    ],
  },
  {
    id: 'atlas',
    name: 'Atlas Sovereign AI',
    bio: 'A sovereign cloud funded by a national treasury: patient, political, and allergic to any ranking it does not top.',
    moves: [
      '{rival} opened a campus with a ribbon, a choir, and a footnote about capacity figures nobody may audit.',
      '{rival} underbid every commercial operator in a national tender and described the result as a market decision.',
      '{rival} hired returned diaspora engineers with salaries, fast-tracked citizenship, and what witnesses call genuine gratitude.',
      '{rival} signed a model-training pact with a neighboring state; the press release carried four flags.',
      '{rival} suffered an outage they described as scheduled maintenance, nine hours after it began.',
      '{rival} pivoted toward hosting the state entire digital bureaucracy, which at their scale counts as diversification.',
    ],
    reactsToYou: [
      '{rival} cited your uptime in a policy white paper as evidence the market needs guiding.',
      '{rival} copied your pricing structure down to the surcharge names, translated them, and denied both.',
      '{rival} offered your executives advisory seats at a summit where the coffee, like everything else, was state-funded.',
      '{rival} remarked that foreign operators lack accountability, in a speech delivered within sight of your cooling towers.',
    ],
  },
];

export const VOICES: CustomerVoice[] = [
  { customer: 'Stealth Labs', renews: 'Renewing. Also, nobody look at our dashboards until Friday. It is fine. Mostly fine.', leaves: 'We are pivoting to a platform play. The platform is a spreadsheet. Bye.' },
  { customer: 'Glyph AI', renews: 'Renewed! Our GPU bill finally fits on one slide. A dense slide.', leaves: 'We got acquired. Nobody told the GPU budget. Cancel everything, sorry, love you.' },
  { customer: 'Peregrine Models', renews: 'Renewing. Our last run took nine days here versus a month anywhere else.', leaves: 'Investors say diversified cloud. We say goodbye. The migration is already on fire.' },
  { customer: 'Otter Systems', renews: 'Renewal in. Your staff fixed our config at 2am. That is the whole testimonial.', leaves: 'Finance moved us in-house. The in-house rack is on a loading dock somewhere.' },
  { customer: 'VectorForge', renews: 'Renewed. Billing finally matches our forecast, which terrifies everyone here.', leaves: 'Moving to reserved capacity elsewhere. Cheaper by four percent. We will miss the uptime.' },
  { customer: 'MIT LIDS', renews: 'Renewed. The grant committee approved the extension; the results section writes itself.', leaves: 'The funding cycle ended. We return to a departmental cluster and, frankly, suffering.' },
  { customer: 'Flatiron Institute', renews: 'Renewed per standard procurement. The simulation throughput has been exemplary.', leaves: 'Our allocation moved to a national facility. Please archive everything correctly.' },
  { customer: 'CERN OpenLab', renews: 'Renewed. The data challenges ran on schedule, which nobody here believes.', leaves: 'Budget consolidation. The open-source stack moves to a member institute cluster.' },
  { customer: 'RIKEN AICS', renews: 'Renewal approved. Performance per watt has met the committee expectations.', leaves: 'The fiscal year closed our external allocations. With respect, sayonara.' },
  { customer: 'Turing Institute', renews: 'Renewed. The reproducibility report cited your stability data twice.', leaves: 'A partner institute offered matching capacity. Academic loyalty loses to matching.' },
  { customer: 'Acme Retail Media', renews: 'Renewed via PO 88231. Uptime met SLA; invoices matched contract. Ideal.', leaves: 'Per the Q3 vendor review we consolidated suppliers. Expect a records request.' },
  { customer: 'Helios Bank', renews: 'Renewed after risk committee sign-off. Your audit responses were, unusually, complete.', leaves: 'The regulator prefers in-region processing. Contract terminated per clause 14.2.' },
  { customer: 'Nordwind Auto', renews: 'Renewal executed. Crash-simulation queue latency finally met engineering requirements.', leaves: 'Procurement selected a bundled provider. The decision tested well with focus groups.' },
  { customer: 'MedSyn Pharma', renews: 'Renewed. The trial workload completed ahead of schedule; compliance signed off.', leaves: 'Following an internal review we are consolidating with a GxP-certified provider.' },
  { customer: 'Skyline Telecom', renews: 'Renewed. The interconnect bills arrived accurate, a first in our professional lives.', leaves: 'A network reorganization ends this contract. Goodbye, and please retain the access logs.' },
  { customer: 'EU Sovereign Cloud', renews: 'The framework agreement is extended. Compliance documentation was found satisfactory.', leaves: 'The data-residency review concluded. The framework will not be renewed.' },
  { customer: 'Emirates AI Council', renews: 'Renewal is approved. His excellency notes the latency improvements with pleasure.', leaves: 'A national capacity directive requires consolidation. Closure is regretted but ordered.' },
  { customer: 'Nippon AI Grid', renews: 'Renewal confirmed. The consortium thanks you for the disaster-recovery drill results.', leaves: 'The consortium has selected a domestic operator. Cooperation concludes with respect.' },
  { customer: 'Sovereign Tech Fund', renews: 'Renewed. The portfolio companies report acceptable utilization and fewer escalations.', leaves: 'The fund is redirecting capacity to a strategic partner. Goodbye.' },
];

