import React from 'react';
import { X, Lock } from 'lucide-react';

interface InventoryPanelProps {
  open: boolean;
  onClose: () => void;
  gold: number;
  silver?: number;
}

const ITEMS = [
  { icon: '🍞', name: 'Trail Bread' },
  { icon: '🍎', name: 'Pixel Apple' },
  { icon: '🧪', name: 'River Tonic' },
  { icon: '🌿', name: 'Sage Twig' },
  { icon: '🍃', name: 'Park Leaf' },
  { icon: '🎣', name: 'Starter Rod' },
  { icon: '🐟', name: 'Neon Guppy' },
  { icon: '📦', name: 'Card Pack' },
  { icon: '🔑', name: 'Hub Key' },
  { icon: '✨', name: 'Fish Charm' },
  { icon: '🍲', name: 'Harbor Soup' },
  { icon: '🪵', name: 'Dock Plank' }
];

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ open, onClose, gold, silver = 119 }) => {
  if (!open) return null;

  return (
    <aside className="inv-panel" aria-label="Inventory">
      <header className="inv-header">
        <div>
          <h2>Bag</h2>
          <div className="inv-currency">
            <span>🪙 {gold}</span>
            <span>⚪ {silver}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inventory">
          <X size={16} />
        </button>
      </header>
      <div className="inv-grid">
        {ITEMS.map((item, i) => (
          <button key={i} type="button" className="inv-cell" title={item.name}>
            <span>{item.icon}</span>
          </button>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`lock-${i}`} className="inv-cell locked">
            <Lock size={14} />
          </div>
        ))}
      </div>
      <p className="inv-tip">Press I or Tab to close · Upgrade bag at the Card Shop</p>
    </aside>
  );
};
