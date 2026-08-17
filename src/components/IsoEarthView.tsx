import React, { useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { IsoEarth, RemotePlayer } from '../game/iso/IsoEarth';
import { DistrictRealm } from '../game/iso/IsoTiles';
import { multiplayerSync } from '../game/MultiplayerSync';
import { npcDirector } from '../game/npc/NpcDirector';
import { RpgDialogueStage } from './RpgDialogueStage';
import { NpcDebugPanel } from './NpcDebugPanel';
import { StoryBanner } from '../game/npc/dialogue/types';

export interface IsoEarthViewHandle {
  loadDistrict: (realm: DistrictRealm) => void;
  setJoystick: (dir: { x: number; y: number }) => void;
  getWorldTime: () => ReturnType<typeof npcDirector.getWorldTime>;
}

interface IsoEarthViewProps {
  avatar: {
    username: string;
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
  };
  onDistrictChange?: (district: DistrictRealm) => void;
  onNpcTalked?: (npcId: string) => void;
  visible: boolean;
}

export const IsoEarthView = forwardRef<IsoEarthViewHandle, IsoEarthViewProps>(
  ({ avatar, onDistrictChange, onNpcTalked, visible }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const earthRef = useRef<IsoEarth | null>(null);
    const remotesRef = useRef<RemotePlayer[]>([]);
    const [realm, setRealm] = useState<DistrictRealm>('city_center');
    const [prompt, setPrompt] = useState<{ kind: string; name: string } | null>(null);
    const [dialogueNpcId, setDialogueNpcId] = useState<string | null>(null);
    const [dialogueOpen, setDialogueOpen] = useState(false);
    const [dialogueMode, setDialogueMode] = useState<'npc' | 'overhear' | 'player'>('npc');
    const [remoteChat, setRemoteChat] = useState<RemotePlayer | null>(null);
    const [debugOpen, setDebugOpen] = useState(false);
    const [banners, setBanners] = useState<StoryBanner[]>([]);

    useImperativeHandle(ref, () => ({
      loadDistrict: (next: DistrictRealm) => {
        setRealm(next);
        onDistrictChange?.(next);
        earthRef.current?.warpToDistrict(next);
      },
      setJoystick: (dir: { x: number; y: number }) => {
        if (earthRef.current) earthRef.current.joystickDir = dir;
      },
      getWorldTime: () => npcDirector.getWorldTime()
    }));

    useEffect(() => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        earthRef.current?.recenterOrigin();
      };
      resize();

      const earth = new IsoEarth(canvas, 'city_center');
      earth.setAvatar(avatar);
      earth.onNpcPromptChange = p => setPrompt(p ? { kind: p.kind, name: p.name } : null);
      earth.onInteractNpc = id => {
        setDialogueMode('npc');
        setRemoteChat(null);
        setDialogueNpcId(id);
        setDialogueOpen(true);
      };
      earth.onInteractOverhear = () => {
        setDialogueMode('overhear');
        setRemoteChat(null);
        setDialogueNpcId(npcDirector.dialogueRt.overhearHint?.npcId ?? null);
        setDialogueOpen(true);
      };
      earth.onInteractPlayer = id => {
        const rp = remotesRef.current.find(p => p.id === id) ?? null;
        setRemoteChat(rp);
        setDialogueMode('player');
        setDialogueNpcId(null);
        setDialogueOpen(true);
      };
      earthRef.current = earth;
      earth.start();

      multiplayerSync.start(avatar.username, {
        onUpdate: state => {
          remotesRef.current = state.nearby;
          earth.setRemotePlayers(state.nearby);
        }
      });

      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'F3') {
          e.preventDefault();
          setDebugOpen(v => !v);
        }
      };
      window.addEventListener('keydown', onKey);
      window.addEventListener('resize', resize);
      return () => {
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', resize);
        earth.stop();
        multiplayerSync.stop();
      };
    }, []);

    useEffect(() => {
      earthRef.current?.setAvatar(avatar);
    }, [avatar]);

    useEffect(() => {
      if (earthRef.current) earthRef.current.dialogueLocked = dialogueOpen;
    }, [dialogueOpen]);

    useEffect(() => {
      if (!visible) return;
      const id = setInterval(() => {
        const e = earthRef.current;
        if (!e) return;
        multiplayerSync.updatePose(realm, e.playerCol, e.playerRow);
        const next = npcDirector.dialogueRt.consumeBanners();
        if (next.length) setBanners(b => [...b, ...next].slice(-4));
      }, 1000);
      return () => clearInterval(id);
    }, [realm, visible]);

    const hint =
      prompt && !dialogueOpen
        ? prompt.kind === 'overhear'
          ? `E · Listen to ${prompt.name}`
          : prompt.kind === 'player'
            ? `E · Talk to ${prompt.name}`
            : `E · Talk to ${prompt.name}`
        : null;

    return (
      <div className={`game-stage ${visible ? 'is-visible' : 'is-hidden'}`}>
        <canvas ref={canvasRef} className="game-canvas" />
        {hint ? <div className="npc-interact-hint">{hint}</div> : null}
        {banners.map(b => (
          <div key={b.id} className={`rpg-story-banner is-${b.kind}`}>
            <strong>{b.title}</strong>
            <span>{b.text}</span>
            <button type="button" onClick={() => setBanners(list => list.filter(x => x.id !== b.id))}>
              ×
            </button>
          </div>
        ))}
        <RpgDialogueStage
          open={dialogueOpen}
          npcId={dialogueNpcId}
          remotePlayer={remoteChat}
          mode={dialogueMode}
          onClose={() => {
            setDialogueOpen(false);
            setRemoteChat(null);
          }}
          onTalked={onNpcTalked}
        />
        <NpcDebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
      </div>
    );
  }
);

IsoEarthView.displayName = 'IsoEarthView';
