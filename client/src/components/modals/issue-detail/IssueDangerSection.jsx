import { useState, useRef, useEffect, useCallback } from "react";
import { Collapse } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronRight,
  IconTrash,
  IconArchive,
} from "@tabler/icons-react";

const HOLD_DURATION = 750; // ms to hold for delete
const TICK_INTERVAL = 16; // ~60fps updates

export function IssueDangerSection({
  issue,
  isSubtask,
  onDelete,
  onArchive,
}) {
  const [expanded, setExpanded] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [archiveConfirming, setArchiveConfirming] = useState(false);
  const holdStartRef = useRef(null);
  const intervalRef = useRef(null);

  const canArchive = issue.status === "done" && !issue.archived_at;
  const entityName = isSubtask ? "subtask" : "issue";

  const clearHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(() => {
    holdStartRef.current = Date.now();
    setIsHolding(true);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearHold();
        onDelete();
      }
    }, TICK_INTERVAL);
  }, [onDelete, clearHold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleArchiveClick = () => {
    if (archiveConfirming) {
      onArchive();
      setArchiveConfirming(false);
    } else {
      setArchiveConfirming(true);
    }
  };

  return (
    <div className="danger-zone">
      <button
        className="danger-zone-trigger"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <IconChevronDown size={14} />
        ) : (
          <IconChevronRight size={14} />
        )}
        <span>Danger zone</span>
      </button>

      <Collapse in={expanded}>
        <div className="danger-zone-content">
          {/* Archive - amber, recoverable action */}
          {canArchive && (
            <button
              className={`danger-zone-action danger-zone-archive ${archiveConfirming ? "confirming" : ""}`}
              onClick={handleArchiveClick}
              onBlur={() => setArchiveConfirming(false)}
            >
              <IconArchive size={14} />
              <span>
                {archiveConfirming
                  ? `Confirm archive`
                  : `Archive ${entityName}`}
              </span>
            </button>
          )}

          {/* Delete - red, hold to confirm */}
          <button
            className={`danger-zone-action danger-zone-delete ${isHolding ? "holding" : ""}`}
            onMouseDown={startHold}
            onMouseUp={clearHold}
            onMouseLeave={clearHold}
            onTouchStart={startHold}
            onTouchEnd={clearHold}
          >
            <div
              className="danger-zone-delete-progress"
              style={{ width: `${holdProgress}%` }}
            />
            <IconTrash size={14} />
            <span>
              {isHolding ? "Hold to delete..." : `Delete ${entityName}`}
            </span>
          </button>
        </div>
      </Collapse>
    </div>
  );
}
