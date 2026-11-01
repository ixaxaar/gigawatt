import { useState, type ReactNode } from 'react';
import { useGame } from '../store';

/** Contextual explainer — visible in Learner mode (and collapsible in Operator mode). */
export default function Tip({ children }: { children: ReactNode }) {
  const mode = useGame(s => s.game.mode ?? 'operator');
  const [open, setOpen] = useState(mode === 'learner');
  if (mode === 'tycoon') return null;
  if (!open) return <div style={{ textAlign: 'right' }}><a className="dim" style={{ cursor: 'pointer', fontSize: 12 }} onClick={() => setOpen(true)}>💡 explain this screen</a></div>;
  return <div className="tipbox"><div style={{ float: 'right', cursor: 'pointer' }} className="dim" onClick={() => setOpen(false)}>✕</div>💡 {children}</div>;
}
