import React from 'react';

interface Props {
  open: boolean;
  title: string;
  kicker?: string;
  wide?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Reusable in-world parchment popup — inventory, settings, servers, social. */
export const GamePopup: React.FC<Props> = ({ open, title, kicker, wide, onClose, children, footer }) => {
  if (!open) return null;
  return (
    <div className="game-popup-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`game-popup ${wide ? 'is-wide' : ''}`}>
        <header className="game-popup-header">
          <div>
            {kicker ? <p className="pause-kicker">{kicker}</p> : null}
            <h2>{title}</h2>
          </div>
          {onClose ? (
            <button type="button" className="pause-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          ) : null}
        </header>
        <div className="game-popup-body">{children}</div>
        {footer ? <footer className="game-popup-footer">{footer}</footer> : null}
      </div>
    </div>
  );
};
