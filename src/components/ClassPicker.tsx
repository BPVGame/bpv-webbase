import React from 'react';
import { WeaponType, WEAPON_TYPES } from '../game/Weapons';
import { Shield, Target, Flame, Crosshair, Play } from 'lucide-react';

interface ClassPickerProps {
  onSelectClass: (classType: WeaponType, team: 'blue' | 'red') => void;
  selectedClass: WeaponType;
  selectedTeam: 'blue' | 'red';
}

export const ClassPicker: React.FC<ClassPickerProps> = ({
  onSelectClass,
  selectedClass,
  selectedTeam
}) => {
  const [currentClass, setCurrentClass] = React.useState<WeaponType>(selectedClass);
  const [currentTeam, setCurrentTeam] = React.useState<'blue' | 'red'>(selectedTeam);

  const classes: Array<{ type: WeaponType; title: string; desc: string; icon: React.ReactNode }> = [
    {
      type: 'assault',
      title: 'Assault',
      desc: 'Versatile rifleman equipped for frontline squad pushes.',
      icon: <Flame className="w-6 h-6 text-amber-400" />
    },
    {
      type: 'sniper',
      title: 'Recon Sniper',
      desc: 'Long-range precision shooter with extreme optic zoom.',
      icon: <Target className="w-6 h-6 text-blue-400" />
    },
    {
      type: 'rpg',
      title: 'Engineer',
      desc: 'Heavy explosive specialist equipped with RPG rocket launcher.',
      icon: <Crosshair className="w-6 h-6 text-red-400" />
    },
    {
      type: 'smg',
      title: 'Medic Specialist',
      desc: 'Rapid-fire close quarters combat with high agility.',
      icon: <Shield className="w-6 h-6 text-emerald-400" />
    }
  ];

  const handleDeploy = () => {
    onSelectClass(currentClass, currentTeam);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6 font-sans">
      <div className="flex flex-col gap-6 w-full max-w-4xl glass-panel-accent p-8 rounded-3xl border border-slate-700/60 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 tracking-wider">
              BATTLE PIXEL V
            </h1>
            <p className="text-sm text-slate-400 font-semibold mt-1">
              Select Your Squad Class & Deploy Location
            </p>
          </div>

          {/* Team Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 font-orbitron">
            <button
              onClick={() => setCurrentTeam('blue')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTeam === 'blue'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BLUE FORCES
            </button>
            <button
              onClick={() => setCurrentTeam('red')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTeam === 'red'
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RED SYNDICATE
            </button>
          </div>
        </div>

        {/* Class Selection Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {classes.map(c => {
            const config = WEAPON_TYPES[c.type];
            const isSelected = currentClass === c.type;

            return (
              <div
                key={c.type}
                onClick={() => setCurrentClass(c.type)}
                className={`flex flex-col justify-between p-5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-900/40 to-slate-900/80 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.25)] scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    {c.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-orbitron text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800/60 text-xs font-orbitron">
                  <span className="text-slate-400">WEAPON: <strong className="text-white">{config.name}</strong></span>
                  <span className="text-amber-400">DMG: {config.damage}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Deploy Footer Button */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <div className="text-xs text-slate-400">
            Controls: <kbd className="px-2 py-1 rounded bg-slate-800 text-slate-200">WASD</kbd> Move | <kbd className="px-2 py-1 rounded bg-slate-800 text-slate-200">Mouse</kbd> Aim/Shoot | <kbd className="px-2 py-1 rounded bg-slate-800 text-slate-200">E</kbd> Enter Tank
          </div>

          <button
            onClick={handleDeploy}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-orbitron font-extrabold text-lg tracking-wider shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>DEPLOY TO BATTLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
