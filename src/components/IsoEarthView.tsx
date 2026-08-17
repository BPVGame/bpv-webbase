import React, { useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { IsoEarth } from '../game/iso/IsoEarth';
import { DistrictRealm } from '../game/iso/IsoTiles';
import { multiplayerSync } from '../game/MultiplayerSync';
import { npcDirector } from '../game/npc/NpcDirector';
import { NpcDialogueOverlay } from './NpcDialogueOverlay';
import { NpcDebugPanel } from './NpcDebugPanel';

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
    const [realm, setRealm] = useState<DistrictRealm>('city_center');
    const [prompt, setPrompt] = useState<{ npcId: string; name: string } | null>(null);
    const [dialogueNpcId, setDialogueNpcId] = useState<string | null>(null);
    const [dialogueOpen, setDialogueOpen] = useState(false);
    const [debugOpen, setDebugOpen] = useState(false);

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
      earth.onNpcPromptChange = p => setPrompt(p);
      earth.onInteractNpc = id => {
        setDialogueNpcId(id);
        setDialogueOpen(true);
      };
      earthRef.current = earth;
      earth.start();

      multiplayerSync.start(avatar.username, {
        onUpdate: state => earth.setRemotePlayers(state.nearby)
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
      if (!visible) return;
      const id = setInterval(() => {
        const e = earthRef.current;
        if (!e) return;
        multiplayerSync.updatePose(realm, e.playerCol, e.playerRow);
      }, 1000);
      return () => clearInterval(id);
    }, [realm, visible]);

    return (
      <div className={`game-stage ${visible ? 'is-visible' : 'is-hidden'}`}>
        <canvas ref={canvasRef} className="game-canvas" />
        {prompt && !dialogueOpen ? (
          <div className="npc-interact-hint">E · Talk to {prompt.name}</div>
        ) : null}
        <NpcDialogueOverlay
          open={dialogueOpen}
          npcId={dialogueNpcId}
          onClose={() => setDialogueOpen(false)}
          onTalked={onNpcTalked}
        />
        <NpcDebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
      </div>
    );
  }
);

IsoEarthView.displayName = 'IsoEarthView';
