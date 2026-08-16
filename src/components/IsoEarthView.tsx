import React, { useEffect, useRef, useState } from 'react';
import { IsoEarth } from '../game/iso/IsoEarth';
import { DistrictRealm, DISTRICT_REALMS } from '../game/iso/IsoTiles';
import { generateStarterEarth, STARTER_EARTHS } from '../game/iso/IsoMapData';
import { exportTiledFromGrid } from '../game/iso/TiledMapLoader';
import { multiplayerSync } from '../game/MultiplayerSync';
import { Globe2, Download, Radio } from 'lucide-react';

interface IsoEarthViewProps {
  avatar: {
    username: string;
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
  };
  onDistrictChange?: (district: DistrictRealm) => void;
  visible: boolean;
}

export const IsoEarthView: React.FC<IsoEarthViewProps> = ({ avatar, onDistrictChange, visible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthRef = useRef<IsoEarth | null>(null);
  const [realm, setRealm] = useState<DistrictRealm>('city_center');
  const [mpConnected, setMpConnected] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight - 60;
      earthRef.current?.recenterOrigin();
    };
    resize();

    const earth = new IsoEarth(canvas, generateStarterEarth('city_center'));
    earth.setAvatar(avatar);
    earthRef.current = earth;
    earth.start();

    multiplayerSync.start(avatar.username, {
      onUpdate: state => {
        setMpConnected(state.connected);
        earth.setRemotePlayers(state.nearby);
      }
    });

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      earth.stop();
      multiplayerSync.stop();
    };
  }, []);

  useEffect(() => {
    earthRef.current?.setAvatar(avatar);
  }, [avatar]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      const e = earthRef.current;
      if (!e) return;
      multiplayerSync.updatePose(realm, e.playerCol, e.playerRow);
    }, 1000);
    return () => clearInterval(id);
  }, [realm, visible]);

  const switchRealm = (next: DistrictRealm) => {
    setRealm(next);
    onDistrictChange?.(next);
    earthRef.current?.loadMap(generateStarterEarth(next));
  };

  const downloadTiled = () => {
    const e = earthRef.current;
    if (!e) return;
    const tmj = exportTiledFromGrid(e.map.tiles, {
      name: e.map.id,
      isometric: true,
      tilewidth: 64,
      tileheight: 32
    });
    const blob = new Blob([JSON.stringify(tmj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${e.map.id}.tmj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`absolute inset-0 ${visible ? 'block' : 'hidden'}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="glass-panel rounded-2xl px-3 py-2 flex items-center gap-2 text-xs font-orbitron">
          <Globe2 className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold tracking-wider">ISO EARTH</span>
          <span className="text-slate-500">|</span>
          <Radio className={`w-3 h-3 ${mpConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className={mpConnected ? 'text-emerald-400' : 'text-slate-400'}>
            {mpConnected ? 'ONLINE' : 'LOCAL'}
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-2 flex flex-wrap gap-1 max-w-md">
          {STARTER_EARTHS.map(id => {
            const meta = DISTRICT_REALMS.find(d => d.id === id)!;
            const active = realm === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchRealm(id)}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-orbitron font-bold transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={downloadTiled}
        className="absolute top-4 right-4 z-20 glass-panel rounded-xl px-3 py-2 text-[10px] font-orbitron font-bold text-slate-200 flex items-center gap-2 hover:text-amber-300"
      >
        <Download className="w-3.5 h-3.5" />
        EXPORT TILED .TMJ
      </button>
    </div>
  );
};
