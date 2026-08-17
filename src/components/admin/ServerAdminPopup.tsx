import React, { useEffect, useState } from 'react';
import { GamePopup } from '../ui/GamePopup';
import { onlineGate } from '../../net/OnlineGate';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ServerAdminPopup: React.FC<Props> = ({ open, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [inspect, setInspect] = useState<any>(null);

  const reload = async () => {
    if (!onlineGate.sessionId) {
      setError('No online session');
      return;
    }
    const r: any = await onlineGate.admin();
    if (!r.ok) setError(r.error || 'forbidden');
    else {
      setError('');
      setData(r);
    }
  };

  useEffect(() => {
    if (open) void reload();
  }, [open]);

  const act = async (type: string, username: string) => {
    if (!onlineGate.sessionId) return;
    await onlineGate.action(type, { username, col: 0, row: 0 });
    void reload();
  };

  return (
    <GamePopup open={open} wide kicker="Owner" title="Server panel" onClose={onClose}>
      {error ? <p className="gate-error">{error}</p> : null}
      <p className="gate-empty">{data?.config?.name} · max {data?.config?.max_players}</p>
      <h3>Online players</h3>
      <div className="admin-list">
        {(data?.players ?? []).map((p: any) => (
          <div key={p.id} className="admin-row">
            <span>
              {p.username} · {p.role} · Lv{p.level}
            </span>
            <button type="button" onClick={() => setInspect(p)}>
              Inspect
            </button>
            <button type="button" onClick={() => void act('admin_kick', p.username)}>
              Kick
            </button>
            <button type="button" onClick={() => void act('admin_ban', p.username)}>
              Ban
            </button>
            <button type="button" onClick={() => void act('admin_teleport', p.username)}>
              Teleport
            </button>
          </div>
        ))}
      </div>
      {inspect ? (
        <p className="gate-empty">
          Inspect {inspect.username}: role {inspect.role} · Lv{inspect.level} · {inspect.coins} coins · tile {inspect.col},
          {inspect.row}
        </p>
      ) : null}
      <h3>Logs</h3>
      <pre className="admin-logs">{(data?.logs ?? []).join('\n')}</pre>
    </GamePopup>
  );
};
