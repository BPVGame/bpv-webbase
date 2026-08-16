import React, { useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { IsoEarth } from '../game/iso/IsoEarth';
import { DistrictRealm } from '../game/iso/IsoTiles';
import { multiplayerSync } from '../game/MultiplayerSync';

export interface IsoEarthViewHandle {
  loadDistrict: (realm: DistrictRealm) => void;
  setJoystick: (dir: { x: number; y: number }) => void;
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
  visible: boolean;
}

export const IsoEarthView = forwardRef<IsoEarthViewHandle, IsoEarthViewProps>(
  ({ avatar, onDistrictChange, visible }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const earthRef = useRef<IsoEarth | null>(null);
    const [realm, setRealm] = useState<DistrictRealm>('city_center');

    useImperativeHandle(ref, () => ({
      loadDistrict: (next: DistrictRealm) => {
        setRealm(next);
        onDistrictChange?.(next);
        earthRef.current?.warpToDistrict(next);
      },
      setJoystick: (dir: { x: number; y: number }) => {
        if (earthRef.current) earthRef.current.joystickDir = dir;
      }
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
      earthRef.current = earth;
      earth.start();

      multiplayerSync.start(avatar.username, {
        onUpdate: state => earth.setRemotePlayers(state.nearby)
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

    return (
      <div className={`game-stage ${visible ? 'is-visible' : 'is-hidden'}`}>
        <canvas ref={canvasRef} className="game-canvas" />
      </div>
    );
  }
);

IsoEarthView.displayName = 'IsoEarthView';
