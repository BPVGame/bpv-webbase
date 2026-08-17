import React, { useEffect, useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { LAND_BRUSHES, LandTileId, sandboxVm } from '../../game/sandbox';
import { retroAudio } from '../../game/AudioSynth';

interface Props {
  open: boolean;
  founder: string;
  pose: { col: number; row: number };
  brush: LandTileId;
  onBrush: (id: LandTileId) => void;
  onClose: () => void;
}

export const GovernmentPanel: React.FC<Props> = ({ open, founder, pose, brush, onBrush, onClose }) => {
  const [, setTick] = useState(0);
  const [name, setName] = useState('Havenbrook');
  const [motto, setMotto] = useState('By river and road');
  const [colorA, setColorA] = useState('#3a5a8c');
  const [colorB, setColorB] = useState('#e8d4a8');
  const [flagName, setFlagName] = useState('Banner');
  const [decreeTitle, setDecreeTitle] = useState('Civic works');
  const [decreeText, setDecreeText] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    return sandboxVm.subscribe(() => setTick(n => n + 1));
  }, []);

  const g = sandboxVm.snap.government;

  const flash = (msg: string, ok: boolean) => {
    setNote(msg);
    if (ok) retroAudio.playClick();
  };

  return (
    <GamePopup open={open} wide kicker="Sandbox VM" title="Government" onClose={onClose}>
      {g.founded ? (
        <div className="gov-panel">
          <p className="gov-banner" style={{ borderColor: g.colorA, background: g.colorB }}>
            <strong>{g.name}</strong>
            <span>{g.motto || 'Chartered state'}</span>
            <em>
              Capital {g.capitalCol},{g.capitalRow} · Founder {g.founder}
            </em>
          </p>
          <p className="gate-empty">
            Land {sandboxVm.snap.claims.length} · Flags {sandboxVm.snap.flags.length} · Standing at {pose.col},{pose.row}
          </p>
          <label className="gate-check">
            <input
              type="checkbox"
              checked={sandboxVm.snap.aiEnabled}
              onChange={e => {
                sandboxVm.setAiEnabled(e.target.checked);
                flash(e.target.checked ? 'AI steward on' : 'AI steward paused', true);
              }}
            />
            AI steward may claim land, plant flags, and issue decrees
          </label>
          <p>Land brush</p>
          <div className="gov-brushes">
            {LAND_BRUSHES.map(id => (
              <button key={id} type="button" className={brush === id ? 'active' : ''} onClick={() => onBrush(id)}>
                {id}
              </button>
            ))}
          </div>
          <div className="settings-row">
            <button
              type="button"
              onClick={() => {
                const r = sandboxVm.claimLand({ col: pose.col, row: pose.row, radius: 1, tileId: brush, role: 'governor' });
                if (r.ok) {
                  retroAudio.playClaim();
                  flash(`Claimed ${r.added} tiles`, true);
                } else flash(r.error, false);
              }}
            >
              Claim plaza (C)
            </button>
            <button
              type="button"
              onClick={() => {
                const r = sandboxVm.plantFlag({
                  name: flagName || `${g.name} post`,
                  col: pose.col,
                  row: pose.row,
                  role: 'governor'
                });
                if (r.ok) {
                  retroAudio.playFlag();
                  flash('Flag planted', true);
                } else flash(r.error, false);
              }}
            >
              Plant flag (F)
            </button>
          </div>
          <label className="gate-label">
            Flag name
            <input className="gate-input" value={flagName} onChange={e => setFlagName(e.target.value)} maxLength={28} />
          </label>
          <label className="gate-label">
            Decree title
            <input className="gate-input" value={decreeTitle} onChange={e => setDecreeTitle(e.target.value)} maxLength={48} />
          </label>
          <label className="gate-label">
            Decree
            <input className="gate-input" value={decreeText} onChange={e => setDecreeText(e.target.value)} maxLength={240} />
          </label>
          <button
            type="button"
            onClick={() => {
              const r = sandboxVm.issueDecree({ title: decreeTitle, text: decreeText, author: 'governor' });
              if (r.ok) {
                retroAudio.playDecree();
                setDecreeText('');
                flash('Decree issued', true);
              } else flash(r.error, false);
            }}
          >
            Issue decree
          </button>
          {note ? <p className="gov-note">{note}</p> : null}
          <ul className="gov-laws">
            {sandboxVm.snap.decrees.slice(0, 8).map(d => (
              <li key={d.id}>
                <strong>{d.title}</strong>
                <span>
                  {d.author} · {d.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="gov-panel">
          <p>Found a government on the infinite IsoEarth. You are the Governor. The AI VM can later act as a co-steward.</p>
          <label className="gate-label">
            State name
            <input className="gate-input" value={name} onChange={e => setName(e.target.value)} maxLength={32} />
          </label>
          <label className="gate-label">
            Motto
            <input className="gate-input" value={motto} onChange={e => setMotto(e.target.value)} maxLength={80} />
          </label>
          <div className="gov-colors">
            <label>
              Flag A
              <input type="color" value={colorA} onChange={e => setColorA(e.target.value)} />
            </label>
            <label>
              Flag B
              <input type="color" value={colorB} onChange={e => setColorB(e.target.value)} />
            </label>
          </div>
          <p className="gate-empty">
            Capital will be planted at {pose.col},{pose.row}
          </p>
          {note ? <p className="gov-note">{note}</p> : null}
          <button
            type="button"
            className="main-menu-play gov-found"
            onClick={() => {
              const r = sandboxVm.foundState({
                name,
                motto,
                founder,
                colorA,
                colorB,
                col: pose.col,
                row: pose.row,
                role: 'governor'
              });
              if (r.ok) {
                retroAudio.playDecree();
                retroAudio.playFlag();
                flash(`${name} founded`, true);
              } else flash(r.error, false);
            }}
          >
            Found state
          </button>
        </div>
      )}
    </GamePopup>
  );
};
