// src/components/UndoRequestModal.tsx
import { useState } from "react";
import type { PlayerColor } from "../types";
import { colorMap } from "../utils/colorUtils";

interface UndoRequestModalProps {
  requesterName: string;
  requesterColor: PlayerColor;
  onApprove: () => void;
  onDeny: () => void;
}

export function UndoRequestModal({
  requesterName,
  requesterColor,
  onApprove,
  onDeny,
}: UndoRequestModalProps) {
  const [isResponding, setIsResponding] = useState(false);

  // Get the exact hex code of the requester to theme the modal
  const requesterHex = colorMap[requesterColor] || '#ffc107';

  const respond = async (approve: boolean) => {
    if (isResponding) return;
    setIsResponding(true);
    if (approve) onApprove();
    else onDeny();
    // No need to clear isResponding on success - this popup unmounts as soon
    // as the resulting game_update lands (pendingUndo goes away, or this
    // player's vote is no longer null). If the request errors out, GameComponent
    // re-renders this same modal fresh, so a stuck disabled state can't linger.
  };

  return (
    <div className="modal-overlay undo-request-overlay">
      <div 
        className="modal-content undo-request-content"
        style={{ '--requester-color': requesterHex } as React.CSSProperties}
      >
        <div className="undo-request-header">
          <h3 className="undo-request-title shimmer-text" data-text="Undo Request">Undo Request</h3>
        </div>
        
        <div className="undo-request-body">
          <div className="undo-request-player">
            <div className="undo-request-gem-wrapper">
              <img
                src={`/images/stones/${requesterColor}.webp`}
                alt={`${requesterName}'s gem`}
                className="undo-request-gem"
              />
            </div>
          </div>
          <p className="undo-request-message">
            All other players must approve.
          </p>
        </div>

        <div className="undo-request-actions">
          <button
            type="button"
            className="undo-response-image-btn"
            onClick={() => respond(true)}
            disabled={isResponding}
            aria-label="Approve undo request"
          >
            <img src="/images/buttons/approve.webp" alt="Approve" draggable={false} />
          </button>
          <button
            type="button"
            className="undo-response-image-btn"
            onClick={() => respond(false)}
            disabled={isResponding}
            aria-label="Deny undo request"
          >
            <img src="/images/buttons/deny.webp" alt="Deny" draggable={false} />
          </button>
        </div>
      </div>
    </div>
  );
}