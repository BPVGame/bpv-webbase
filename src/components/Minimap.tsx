import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/Engine';

interface MinimapProps {
  engine: GameEngine;
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;

    const renderMinimap = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const mapScale = 0.65; // map to canvas coordinate scale ratio

      // Clear
      ctx.fillStyle = '#0b1329';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      const worldToCanvas = (wx: number, wz: number) => ({
        cx: width / 2 + wx * mapScale,
        cy: height / 2 + wz * mapScale
      });

      // Render Capture Points (A, B, C)
      engine.world.capturePoints.forEach(cp => {
        const { cx, cy } = worldToCanvas(cp.position.x, cp.position.z);
        const color = cp.owner === 'blue' ? '#3b82f6' : cp.owner === 'red' ? '#ef4444' : '#94a3b8';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cp.id, cx, cy);
      });

      // Render Vehicles
      engine.vehicles.forEach(v => {
        const { cx, cy } = worldToCanvas(v.group.position.x, v.group.position.z);
        ctx.fillStyle = v.team === 'blue' ? '#60a5fa' : '#f87171';
        ctx.fillRect(cx - 5, cy - 5, 10, 10);
      });

      // Render AI Squad Bots
      engine.botManager.bots.forEach(bot => {
        if (!bot.isAlive) return;
        const { cx, cy } = worldToCanvas(bot.mesh.position.x, bot.mesh.position.z);
        ctx.fillStyle = bot.team === 'blue' ? '#3b82f6' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Player position & facing direction cone
      const playerPos = engine.player.position;
      const { cx, cy } = worldToCanvas(playerPos.x, playerPos.z);

      // Facing cone
      const yaw = engine.player.yaw;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 22, yaw - 0.45, yaw + 0.45);
      ctx.closePath();
      ctx.fill();

      // Player Dot
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(renderMinimap);
    };

    renderMinimap();
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="absolute top-6 left-6 pointer-events-none z-30 flex flex-col items-center gap-1">
      <div className="rounded-2xl p-1.5 glass-panel border border-slate-700/60 shadow-2xl overflow-hidden">
        <canvas ref={canvasRef} width={160} height={160} className="rounded-xl" />
      </div>
      <span className="text-[10px] font-orbitron font-semibold text-slate-400 tracking-wider">
        TACTICAL RADAR
      </span>
    </div>
  );
};
