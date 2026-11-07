// What each incident or dated event teaches. The log stays punchy; the Codex ("Incident handbook") carries the lesson.
export interface Lesson { id: string; icon: string; title: string; what: string; lesson: string }

export const LESSONS: Lesson[] = [
  { id: 'energy-crisis', icon: '⚡', title: 'Energy crisis', what: 'The utility rate jumps for a while; every kilowatt-hour costs more.', lesson: 'Power is the biggest opex line: long-term PPAs, on-site solar or gas and a lower PUE are how real operators hedge.' },
  { id: 'heatwave', icon: '🌡', title: 'Heatwave', what: 'Dry coolers derate in hot ambient air and halls that depend on them run short of heat rejection.', lesson: 'Warm-water DLC tolerates hot days; air-cooled halls suffer first.' },
  { id: 'fiber-cut', icon: '🧵', title: 'Fiber cut', what: 'A backhoe cuts your only fiber route and customers lose connectivity.', lesson: 'Buy a second circuit from a different carrier on a diverse path.' },
  { id: 'utility-outage', icon: '🔌', title: 'Utility outage', what: 'The grid drops; protection decides whether training keeps running.', lesson: 'UPS plus battery plus generator plus transfer switch, sized N+1, keep training alive.' },
  { id: 'gpu-rush', icon: '📦', title: 'The GPU gold rush (Mar 2023)', what: 'A chatbot goes viral and allocation is slashed; orders already in the pipeline slip.', lesson: 'Lead times quoted in a soft market are fiction in a hot one: order ahead and hold spares.' },
  { id: 'liquid-era', icon: '💧', title: 'Liquid cooling goes mainstream (Apr 2024)', what: 'The Blackwell generation arrives with racks that cannot be air-cooled at all.', lesson: 'Plan the DLC transition early: CDUs, coolant quality and floor plumbing have lead times of their own.' },
  { id: 'allocation', icon: '🧲', title: 'Allocation for proven operators (Feb 2026)', what: 'The chip vendor opens next-generation allocation and existing operators get first call.', lesson: 'Vendors reward demonstrated deployments: a campus that ships on schedule is your ticket to the next generation.' },
  { id: 'fire', icon: '🔥', title: 'Hall fire', what: 'A rack catches fire; early detection decides whether it is a bad weekend or a total loss.', lesson: 'Detection and suppression turn a total loss into a bad weekend, and they cost little next to a hall of GPUs.' },
  { id: 'default', icon: '💸', title: 'Customer default', what: 'A customer goes bankrupt mid-contract and the cluster goes idle.', lesson: 'Deposits, take-or-pay minimums and credit checks exist because customers go bankrupt mid-deal.' },
  { id: 'supply-shock', icon: '🚢', title: 'Supply-chain shock', what: 'A fab closes and a port strikes; everything in transit slips.', lesson: 'Dual-sourcing and safety stock are insurance, not waste.' },
  { id: 'chiller-trip', icon: '❄', title: 'Chiller trip', what: 'A compressor fault drops the chilled-water loop and serving contracts take SLA misses.', lesson: 'N+1 chillers with automatic switchover keep the water cold while one unit is repaired.' },
];
