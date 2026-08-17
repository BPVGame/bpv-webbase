import React, { useEffect, useMemo, useState } from 'react';
import { npcDirector } from '../game/npc/NpcDirector';
import { RpgDialogueScene } from '../game/npc/dialogue/types';
import { emotionLabel } from '../game/npc/dialogue/portraits';
import { NpcPortrait } from './NpcPortrait';
import { bpvApi } from '../api/BpvApiClient';

interface Props {
  open: boolean;
  npcId: string | null;
  remotePlayer?: { id: string; username: string; skin: string; hair?: string; shirt: string } | null;
  mode: 'npc' | 'overhear' | 'player';
  onClose: () => void;
  onTalked?: (npcId: string) => void;
}

export const RpgDialogueStage: React.FC<Props> = ({ open, npcId, remotePlayer, mode, onClose, onTalked }) => {
  const [scene, setScene] = useState<RpgDialogueScene | null>(null);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [ask, setAsk] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setScene(null);
      setVisible(false);
      return;
    }
    setVisible(true);
    setShown(0);
    setAskOpen(false);
    if (mode === 'player' && remotePlayer) {
      setScene(npcDirector.dialogueRt.beginPlayerTalk(remotePlayer));
      return;
    }
    if (mode === 'overhear') {
      const s = npcDirector.listenIn();
      setScene(s);
      return;
    }
    if (!npcId) return;
    const s = npcDirector.beginTalk(npcId);
    setScene(s);
    if (s) onTalked?.(npcId);
  }, [open, npcId, mode, remotePlayer?.id]);

  const line = scene?.lines[scene.lineIndex];
  const speaker = scene?.speakers.find(s => s.id === line?.speakerId) ?? scene?.speakers[0];
  const fullText = line?.text ?? (busy ? '…' : '');

  useEffect(() => {
    if (!open || mode !== 'player' || !remotePlayer) return;
    const id = window.setInterval(async () => {
      const res = await bpvApi.getPlayerChat(npcDirector.player.username, remotePlayer.username);
      if (!res.ok || !res.messages?.length) return;
      const last = res.messages[res.messages.length - 1];
      const sceneNow = npcDirector.dialogueRt.scene;
      if (!sceneNow || sceneNow.kind !== 'player_player') return;
      if (sceneNow.lines.some(l => l.text === last.text && l.speakerId !== 'player' && last.from !== npcDirector.player.username)) {
        return;
      }
      if (last.from !== npcDirector.player.username) {
        npcDirector.dialogueRt.appendPlayerChat(remotePlayer.id, last.text, last.emotion);
        setScene(npcDirector.dialogueRt.scene);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [open, mode, remotePlayer?.id, remotePlayer?.username]);

  useEffect(() => {
    setShown(0);
    if (!fullText) return;
    const id = window.setInterval(() => {
      setShown(n => {
        if (n >= fullText.length) {
          window.clearInterval(id);
          return fullText.length;
        }
        return n + 1;
      });
    }, 18);
    return () => window.clearInterval(id);
  }, [fullText, scene?.lineIndex]);

  const typed = useMemo(() => fullText.slice(0, shown), [fullText, shown]);
  const complete = shown >= fullText.length;
  const hasMoreLines = !!scene && scene.lineIndex < scene.lines.length - 1;
  const showChoices = complete && !hasMoreLines && (scene?.choices?.length ?? 0) > 0 && mode !== 'player';

  if (!open && !visible) return null;

  const close = () => {
    setVisible(false);
    npcDirector.endDialogue();
    onClose();
  };

  const continueLine = () => {
    if (!complete) {
      setShown(fullText.length);
      return;
    }
    if (hasMoreLines) setScene(npcDirector.advanceDialogue());
  };

  const pick = (id: string) => {
    if (id === 'leave') {
      close();
      return;
    }
    const next = npcDirector.chooseDialogue(id);
    setScene(next);
    setShown(0);
    if (!next) close();
  };

  const sendAsk = async () => {
    if (!ask.trim() || busy) return;
    setBusy(true);
    const text = ask.trim();
    setAsk('');
    if (mode === 'player' && remotePlayer) {
      npcDirector.dialogueRt.appendPlayerChat('player', text, 'happy');
      const res = await bpvApi.sendPlayerChat({
        from: npcDirector.player.username,
        to: remotePlayer.username,
        text,
        emotion: 'happy'
      });
      if (!res.ok) {
        window.setTimeout(() => {
          const current = npcDirector.dialogueRt.scene;
          if (!current) return;
          npcDirector.dialogueRt.appendPlayerChat(
            remotePlayer.id,
            text.toLowerCase().includes('forest')
              ? "Yeah. I'm looking for a rare item."
              : 'Good to meet you out here.',
            'happy'
          );
          setScene(npcDirector.dialogueRt.scene);
        }, 500);
      }
      setScene(npcDirector.dialogueRt.scene);
      setBusy(false);
      return;
    }
    const next = await npcDirector.replyDialogue(text);
    setScene(npcDirector.dialogueRt.scene);
    setBusy(false);
    if (!next) close();
  };

  return (
    <div className={`rpg-dialogue-overlay ${visible ? 'is-in' : 'is-out'}`} role="dialog" aria-label="Dialogue">
      <div className="rpg-dialogue-box">
        {speaker ? (
          <NpcPortrait
            appearance={speaker.appearance}
            emotion={speaker.emotion}
            label={emotionLabel(speaker.emotion)}
          />
        ) : null}
        <div className="rpg-dialogue-main">
          <div className="rpg-dialogue-name">
            <strong>{speaker?.name ?? '…'}</strong>
            {speaker?.username && speaker.username !== speaker.name ? <em>{speaker.username}</em> : null}
            {scene?.overheard ? <span className="rpg-tag">Overheard</span> : null}
            {scene?.kind === 'player_player' ? <span className="rpg-tag">Online</span> : null}
          </div>
          <p className="rpg-dialogue-text">
            {typed}
            {!complete ? <span className="rpg-caret">▌</span> : null}
          </p>
          {showChoices ? (
            <div className="rpg-choices">
              {scene!.choices!.map(c => (
                <button key={c.id} type="button" className={`rpg-choice tone-${c.tone}`} onClick={() => pick(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="rpg-dialogue-actions">
              {mode !== 'player' ? (
                <button type="button" className="rpg-continue" onClick={continueLine}>
                  {complete && !hasMoreLines ? '…' : 'Continue'}
                </button>
              ) : null}
              <button type="button" className="rpg-ghost" onClick={() => setAskOpen(v => !v)}>
                {mode === 'player' ? 'Say…' : 'Ask…'}
              </button>
              <button type="button" className="rpg-ghost" onClick={close}>
                Close
              </button>
            </div>
          )}
          {askOpen || mode === 'player' ? (
            <div className="rpg-ask">
              <input
                value={ask}
                onChange={e => setAsk(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void sendAsk()}
                placeholder={mode === 'player' ? 'Message player…' : 'Ask something unexpected…'}
                disabled={busy}
                maxLength={240}
              />
              <button type="button" onClick={() => void sendAsk()} disabled={busy || !ask.trim()}>
                Send
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
