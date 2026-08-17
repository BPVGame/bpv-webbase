import React, { useEffect, useState } from 'react';
import { npcDirector, DialogueState } from '../game/npc/NpcDirector';

interface Props {
  open: boolean;
  npcId: string | null;
  onClose: () => void;
  onTalked?: (npcId: string) => void;
}

export const NpcDialogueOverlay: React.FC<Props> = ({ open, npcId, onClose, onTalked }) => {
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !npcId) {
      setDialogue(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    npcDirector.startDialogue(npcId).then(d => {
      if (!cancelled) {
        setDialogue(d);
        setBusy(false);
        if (d) onTalked?.(d.npcId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, npcId]);

  if (!open) return null;

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    const text = input.trim();
    setInput('');
    const d = await npcDirector.replyDialogue(text);
    setDialogue(d);
    setBusy(false);
  };

  return (
    <div className="npc-dialogue-overlay" role="dialog" aria-label="NPC dialogue">
      <div className="npc-dialogue-card">
        <header>
          <strong>{dialogue?.npcName ?? '…'}</strong>
          <span className="npc-mood">{dialogue?.emotion ?? ''}</span>
          <button type="button" onClick={() => { npcDirector.endDialogue(); onClose(); }}>
            Close
          </button>
        </header>
        <div className="npc-dialogue-lines">
          {busy && !dialogue ? <p className="npc-thinking">Listening…</p> : null}
          {dialogue?.lines.map((l, i) => (
            <p key={i} className={l.role === 'player' ? 'is-player' : 'is-npc'}>
              <span>{l.role === 'player' ? 'You' : dialogue.npcName}</span>
              {l.text}
            </p>
          ))}
        </div>
        <footer>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void send()}
            placeholder="Say something…"
            disabled={busy}
          />
          <button type="button" onClick={() => void send()} disabled={busy || !input.trim()}>
            Speak
          </button>
        </footer>
      </div>
    </div>
  );
};
