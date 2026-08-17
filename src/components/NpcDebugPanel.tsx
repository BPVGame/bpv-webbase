import React, { useEffect, useState } from 'react';
import { npcDirector } from '../game/npc/NpcDirector';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const NpcDebugPanel: React.FC<Props> = ({ open, onClose }) => {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => tick(n => n + 1), 500);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const time = npcDirector.getWorldTime();
  const selected = npcDirector.getSelectedDebug();
  const list = [...npcDirector.npcs.values()];

  return (
    <div className="npc-debug-panel" role="complementary" aria-label="NPC debug">
      <header>
        <strong>NPC Debug</strong>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="npc-debug-meta">
        World {time.date} {time.time} · {time.season} · {time.weather}
      </div>
      <div className="npc-debug-list">
        {list.map(n => (
          <button
            key={n.id}
            type="button"
            className={npcDirector.debugSelectedId === n.id ? 'active' : ''}
            onClick={() => {
              npcDirector.debugSelectedId = n.id;
              tick(x => x + 1);
            }}
          >
            {n.name} <em>{n.simLod}</em>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="npc-debug-detail">
          <p>
            <strong>{selected.npc.name}</strong> · {selected.npc.occupation} · {selected.npc.currentActivity}
          </p>
          <p>
            Loc ({selected.npc.currentLocation.worldX},{selected.npc.currentLocation.worldY}) chunk (
            {selected.npc.currentLocation.chunkX},{selected.npc.currentLocation.chunkY})
          </p>
          <p>
            Mood {selected.npc.currentMood} · Money {selected.npc.money} · Intent{' '}
            {selected.npc.currentIntention?.intent ?? '—'}
          </p>
          <p>Needs {JSON.stringify(selected.npc.needs)}</p>
          <p>
            Rel {selected.relationship ? JSON.stringify(selected.relationship.scores) : 'none'}
          </p>
          <p>
            AI {selected.ai ? `${selected.ai.ok ? 'ok' : 'fail'} ${selected.ai.latencyMs}ms` : '—'} ·{' '}
            {selected.ai?.decision?.intent ?? ''}
          </p>
          <ul>
            {selected.npc.memories.slice(0, 5).map(m => (
              <li key={m.id}>
                {m.event}: {m.description.slice(0, 60)}
              </li>
            ))}
          </ul>
          <div className="npc-debug-actions">
            <button type="button" onClick={() => npcDirector.forceAiDecision(selected.npc.id)}>
              Force AI
            </button>
            <button
              type="button"
              onClick={() => void npcDirector.startDialogue(selected.npc.id)}
            >
              Force Dialogue
            </button>
            <button
              type="button"
              onClick={() =>
                npcDirector.teleportNpc(
                  selected.npc.id,
                  npcDirector.player.worldX + 1,
                  npcDirector.player.worldY
                )
              }
            >
              Teleport Here
            </button>
            <button type="button" onClick={() => npcDirector.resetNpc(selected.npc.id)}>
              Reset NPC
            </button>
          </div>
        </div>
      ) : (
        <p className="npc-debug-hint">Select an NPC</p>
      )}
      <div className="npc-debug-log">
        {npcDirector.log.slice(0, 8).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};
