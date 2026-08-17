import React from 'react';
import { retroAudio } from '../../game/AudioSynth';

interface Props {
  hasSave: boolean;
  onPlay: () => void;
  onOnline: () => void;
  onOffline: () => void;
  onServers: () => void;
  onSettings: () => void;
  onExit: () => void;
}

export const MainMenu: React.FC<Props> = ({
  hasSave,
  onPlay,
  onOnline,
  onOffline,
  onServers,
  onSettings,
  onExit
}) => {
  return (
    <div className="main-menu" role="navigation" aria-label="Main menu">
      <div className="main-menu-card">
        <p className="main-menu-kicker">Battle Pixel V</p>
        <h1 className="main-menu-logo">BPV</h1>
        <p className="main-menu-tag">Living isometric world · Offline or Online</p>
        <div className="main-menu-actions">
          <button
            type="button"
            className="main-menu-play"
            onClick={() => {
              retroAudio.playClick();
              onPlay();
            }}
          >
            PLAY
          </button>
          <button type="button" onClick={() => { retroAudio.playClick(); onOnline(); }}>
            ONLINE
          </button>
          <button type="button" onClick={() => { retroAudio.playClick(); onOffline(); }}>
            OFFLINE{hasSave ? ' · Continue' : ''}
          </button>
          <button type="button" onClick={() => { retroAudio.playClick(); onServers(); }}>
            SERVERS
          </button>
          <button type="button" onClick={() => { retroAudio.playClick(); onSettings(); }}>
            SETTINGS
          </button>
          <button type="button" className="is-ghost" onClick={() => { retroAudio.playClick(); onExit(); }}>
            EXIT GAME
          </button>
        </div>
      </div>
    </div>
  );
};
