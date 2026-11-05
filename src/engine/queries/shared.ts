// Helpers shared by every query module.
import { useGame } from '../../store';
import { TEMPLATES } from '../../data/templates';
import { getItem } from '../../data';

export const st = () => useGame.getState();
export const G = () => st().game;
export const ctxOf = (g: any) => { const placed = g.halls.flatMap((h: any) => h.racks); return { getRack: (id: string) => { const pid = placed.find((p: any) => p.id === id)?.designId ?? id; return g.racks.find((r: any) => r.id === pid); }, getTray: (id: string) => g.trays.find((t: any) => t.id === id), getItem }; };
export const tpl = (id: string) => TEMPLATES.find(t => t.id === id)!;
