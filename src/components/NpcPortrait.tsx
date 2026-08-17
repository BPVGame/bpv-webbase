import React, { useEffect, useRef } from 'react';
import { NpcAppearance } from '../game/npc/types';
import { DialogueEmotion } from '../game/npc/dialogue/types';
import { drawPortrait } from '../game/npc/dialogue/portraits';

interface Props {
  appearance: NpcAppearance;
  emotion: DialogueEmotion;
  size?: number;
  label?: string;
}

export const NpcPortrait: React.FC<Props> = ({ appearance, emotion, size = 112, label }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPortrait(ctx, appearance, emotion, canvas.width, canvas.height);
  }, [appearance, emotion, size]);

  return (
    <div className="rpg-portrait-wrap">
      <canvas ref={ref} className="rpg-portrait" width={size} height={Math.round(size * 1.22)} />
      {label ? <span className="rpg-portrait-emotion">{label}</span> : null}
    </div>
  );
};
