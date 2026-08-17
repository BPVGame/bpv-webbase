/**
 * Original BPV pixel portraits — appearance colors + emotion, not licensed art.
 */

import type { DialogueEmotion, NpcAppearance } from '../types';

const EMOTIONS: DialogueEmotion[] = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'surprised',
  'confused',
  'scared',
  'embarrassed',
  'excited',
  'thinking',
  'laughing',
  'serious'
];

export function normalizeEmotion(raw?: string | null): DialogueEmotion {
  const k = String(raw || 'neutral').toLowerCase();
  if ((EMOTIONS as string[]).includes(k)) return k as DialogueEmotion;
  if (k.includes('happy') || k.includes('joy') || k.includes('warm')) return 'happy';
  if (k.includes('sad') || k.includes('grief')) return 'sad';
  if (k.includes('anger') || k.includes('mad')) return 'angry';
  if (k.includes('surprise') || k.includes('shock')) return 'surprised';
  if (k.includes('confus')) return 'confused';
  if (k.includes('fear') || k.includes('scare')) return 'scared';
  if (k.includes('embarrass') || k.includes('shy')) return 'embarrassed';
  if (k.includes('excit')) return 'excited';
  if (k.includes('think')) return 'thinking';
  if (k.includes('laugh') || k.includes('humor')) return 'laughing';
  if (k.includes('serious') || k.includes('calm') || k.includes('determin')) return 'serious';
  return 'neutral';
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', '').slice(0, 6), 16);
  const pb = parseInt(b.replace('#', '').slice(0, 6), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/** Draw a 16-bit bust into any 2D context. */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  appearance: NpcAppearance,
  emotion: DialogueEmotion,
  width: number,
  height: number
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const blush =
    emotion === 'embarrassed' || emotion === 'happy' || emotion === 'excited' || emotion === 'laughing';
  const angry = emotion === 'angry';
  const sad = emotion === 'sad';
  const scared = emotion === 'scared';
  const skin = angry ? mix(appearance.skin, '#c45c4a', 0.18) : scared ? mix(appearance.skin, '#ffffff', 0.12) : appearance.skin;
  const bg = mix(appearance.shirt, '#1a1510', 0.55);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = mix(appearance.shirt, '#000000', 0.25);
  ctx.fillRect(0, height * 0.62, width, height * 0.38);

  const cx = width / 2;
  const faceW = width * 0.56;
  const faceH = height * 0.48;
  const faceX = cx - faceW / 2;
  const faceY = height * 0.18;

  ctx.fillStyle = appearance.shirt;
  ctx.fillRect(width * 0.12, height * 0.62, width * 0.76, height * 0.38);
  ctx.fillStyle = mix(appearance.shirt, '#000000', 0.2);
  ctx.fillRect(width * 0.12, height * 0.62, width * 0.1, height * 0.38);
  ctx.fillRect(width * 0.78, height * 0.62, width * 0.1, height * 0.38);

  ctx.fillStyle = skin;
  ctx.fillRect(faceX, faceY, faceW, faceH);

  ctx.fillStyle = appearance.hair;
  ctx.fillRect(faceX - 4, faceY - 10, faceW + 8, 16);
  ctx.fillRect(faceX + 6, faceY - 22, faceW - 12, 18);
  if (emotion === 'surprised' || emotion === 'scared') {
    ctx.fillRect(faceX - 2, faceY, 8, 22);
    ctx.fillRect(faceX + faceW - 6, faceY, 8, 22);
  }

  const eyeY = faceY + faceH * (sad ? 0.42 : 0.38);
  const eyeSpread = faceW * 0.18;
  ctx.fillStyle = '#1a120c';
  if (emotion === 'happy' || emotion === 'laughing') {
    ctx.fillRect(cx - eyeSpread - 6, eyeY, 10, 3);
    ctx.fillRect(cx + eyeSpread - 4, eyeY, 10, 3);
  } else if (emotion === 'angry' || emotion === 'serious') {
    ctx.fillRect(cx - eyeSpread - 5, eyeY - 3, 12, 5);
    ctx.fillRect(cx + eyeSpread - 7, eyeY - 3, 12, 5);
    ctx.fillRect(cx - eyeSpread - 8, eyeY - 8, 10, 3);
    ctx.fillRect(cx + eyeSpread - 2, eyeY - 8, 10, 3);
  } else if (emotion === 'confused' || emotion === 'thinking') {
    ctx.fillRect(cx - eyeSpread - 4, eyeY, 8, 8);
    ctx.fillRect(cx + eyeSpread - 2, eyeY - 3, 8, 8);
  } else if (emotion === 'surprised' || emotion === 'scared' || emotion === 'excited') {
    ctx.fillRect(cx - eyeSpread - 6, eyeY - 4, 10, 12);
    ctx.fillRect(cx + eyeSpread - 4, eyeY - 4, 10, 12);
    ctx.fillStyle = '#f5efe4';
    ctx.fillRect(cx - eyeSpread - 3, eyeY - 1, 4, 4);
    ctx.fillRect(cx + eyeSpread - 1, eyeY - 1, 4, 4);
    ctx.fillStyle = '#1a120c';
  } else {
    ctx.fillRect(cx - eyeSpread - 4, eyeY, 8, 8);
    ctx.fillRect(cx + eyeSpread - 4, eyeY, 8, 8);
  }

  if (blush) {
    ctx.fillStyle = 'rgba(220, 90, 110, 0.35)';
    ctx.fillRect(faceX + 4, faceY + faceH * 0.55, 12, 6);
    ctx.fillRect(faceX + faceW - 16, faceY + faceH * 0.55, 12, 6);
  }

  const mouthY = faceY + faceH * 0.72;
  ctx.fillStyle = '#5a3028';
  if (emotion === 'happy' || emotion === 'excited' || emotion === 'laughing') {
    ctx.fillRect(cx - 10, mouthY, 20, 4);
    ctx.fillRect(cx - 12, mouthY - 3, 4, 4);
    ctx.fillRect(cx + 8, mouthY - 3, 4, 4);
    if (emotion === 'laughing') ctx.fillRect(cx - 6, mouthY + 4, 12, 6);
  } else if (emotion === 'sad' || emotion === 'scared') {
    ctx.fillRect(cx - 8, mouthY + 3, 16, 3);
    ctx.fillRect(cx - 10, mouthY + 5, 4, 3);
    ctx.fillRect(cx + 6, mouthY + 5, 4, 3);
  } else if (emotion === 'angry') {
    ctx.fillRect(cx - 8, mouthY, 16, 3);
  } else if (emotion === 'surprised' || emotion === 'embarrassed') {
    ctx.fillRect(cx - 4, mouthY - 2, 8, 10);
  } else if (emotion === 'thinking') {
    ctx.fillRect(cx + 2, mouthY, 8, 3);
  } else {
    ctx.fillRect(cx - 6, mouthY, 12, 3);
  }

  ctx.strokeStyle = '#c4a574';
  ctx.lineWidth = Math.max(2, width * 0.03);
  ctx.strokeRect(1, 1, width - 2, height - 2);
}

export function emotionLabel(emotion: DialogueEmotion): string {
  return emotion.charAt(0).toUpperCase() + emotion.slice(1);
}
