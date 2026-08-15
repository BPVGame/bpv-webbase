import React, { useState } from 'react';
import { PlayerAvatarData } from '../game/PixelEngine';
import { User, Palette, Check } from 'lucide-react';

interface AvatarCustomizerProps {
  avatar: PlayerAvatarData;
  onSaveAvatar: (avatar: PlayerAvatarData) => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ avatar, onSaveAvatar }) => {
  const [skin, setSkin] = useState(avatar.skin || '#fbcfe8');
  const [hair, setHair] = useState(avatar.hair || '#1e293b');
  const [shirt, setShirt] = useState(avatar.shirt || '#2563eb');
  const [pants, setPants] = useState(avatar.pants || '#1e293b');

  const skinOptions = ['#fbcfe8', '#fed7aa', '#d97706', '#78350f', '#fae8ff'];
  const hairOptions = ['#1e293b', '#78350f', '#f59e0b', '#dc2626', '#38bdf8'];
  const shirtOptions = ['#2563eb', '#dc2626', '#10b981', '#7c3aed', '#f59e0b'];
  const pantsOptions = ['#1e293b', '#334155', '#1e3a8a', '#991b1b', '#065f46'];

  const handleSave = () => {
    onSaveAvatar({ ...avatar, skin, hair, shirt, pants });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl h-full p-6 text-white font-orbitron select-none overflow-y-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-indigo-400 tracking-wider">AVATAR CUSTOMIZER</h2>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Customize your 16-bit RPG character appearance on the online map.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 items-center">
        {/* Preview Sprite Canvas Simulation */}
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl glass-panel border border-slate-700/60 shadow-2xl">
          <div className="relative w-36 h-36 flex items-center justify-center bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
            {/* 16-Bit Pixel Avatar Preview */}
            <div className="relative w-16 h-20">
              {/* Legs */}
              <div className="absolute bottom-0 left-2 w-4 h-8" style={{ backgroundColor: pants }}></div>
              <div className="absolute bottom-0 right-2 w-4 h-8" style={{ backgroundColor: pants }}></div>

              {/* Torso */}
              <div className="absolute top-6 left-1 w-14 h-8" style={{ backgroundColor: shirt }}></div>

              {/* Head */}
              <div className="absolute top-1 left-2 w-12 h-6" style={{ backgroundColor: skin }}></div>

              {/* Hair */}
              <div className="absolute top-0 left-1 w-14 h-3" style={{ backgroundColor: hair }}></div>

              {/* Eyes */}
              <div className="absolute top-3 left-3 w-2 h-2 bg-black"></div>
              <div className="absolute top-3 right-3 w-2 h-2 bg-black"></div>
            </div>
          </div>

          <span className="text-sm font-bold text-amber-400 mt-4">{avatar.username}</span>
        </div>

        {/* Color Palette Controls */}
        <div className="flex flex-col gap-5">
          {/* Skin Tone */}
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-2 block">SKIN TONE</label>
            <div className="flex items-center gap-3">
              {skinOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setSkin(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    skin === c ? 'border-amber-400 scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Hair Color */}
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-2 block">HAIR STYLE & COLOR</label>
            <div className="flex items-center gap-3">
              {hairOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setHair(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    hair === c ? 'border-amber-400 scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Shirt Color */}
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-2 block">SHIRT / JACKET</label>
            <div className="flex items-center gap-3">
              {shirtOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setShirt(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    shirt === c ? 'border-amber-400 scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Pants Color */}
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-2 block">PANTS / BOOTS</label>
            <div className="flex items-center gap-3">
              {pantsOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setPants(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    pants === c ? 'border-amber-400 scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 mt-4 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wider shadow-lg transition-all"
          >
            <Check className="w-4 h-4" />
            <span>SAVE AVATAR OUTFIT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
