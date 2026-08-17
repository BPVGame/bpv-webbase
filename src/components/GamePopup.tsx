import React from 'react';
import { X } from 'lucide-react';

interface GamePopupProps {
  open: boolean;
  title: string;
  kicker?: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Cozy in-world modal — world stays visible behind a parchment panel. */
export const GamePopup: React.FC<GamePopupProps> = ({
  open,
  title,
  kicker,
  subtitle,
  onClose,
  wide,
  children,
  footer
}) => {
  if (!open) return null;

  return (
    <div className="game-popup-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`game-popup-panel ${wide ? 'is-wide' : ''}`}>
        <header className="game-popup-header">
          <div>
            {kicker ? <p className="pause-kicker">{kicker}</p> : null}
            <h2>{title}</h2>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          <button type="button" className="pause-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="game-popup-body">{children}</div>
        {footer ? <footer className="game-popup-footer">{footer}</footer> : null}
      </div>
    </div>
  );
};
