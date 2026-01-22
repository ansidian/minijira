import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const CANVAS_DND_TOAST_ID = "canvas-dnd-override";
export const dismissToast = (id) => toast.dismiss(id);

let isToasterHovered = false;
let toasterListenersAttached = false;
let toasterElement = null;
const countdownSubscribers = new Set();

const setToasterHovered = (value) => {
  isToasterHovered = value;
  countdownSubscribers.forEach((callback) => callback(isToasterHovered));
};

const attachToasterHoverListeners = () => {
  if (typeof document === "undefined") return;
  if (toasterElement && !toasterElement.isConnected) {
    toasterListenersAttached = false;
    toasterElement = null;
  }
  if (toasterListenersAttached) return;
  const toaster = document.querySelector("[data-sonner-toaster]");
  if (!toaster) return;
  toasterElement = toaster;
  toasterListenersAttached = true;
  toaster.addEventListener("pointerenter", () => setToasterHovered(true));
  toaster.addEventListener("pointerleave", () => setToasterHovered(false));
};

const toastComponent = ({
  toastId,
  title,
  description,
  actionLabel,
  onAction,
  countdown,
  type,
}) => {
  const formatLabel = (label, remaining) => {
    if (!label) return "";
    if (typeof remaining === "number" && remaining > 0) {
      return `${label} (${remaining})`;
    }
    return label;
  };

  const ActionButton = ({ remaining, isPaused }) => {
    const hasCountdown = typeof remaining === "number";
    const disabled = hasCountdown && remaining <= 0;
    const actionText = formatLabel(actionLabel, remaining);
    const dismissText = formatLabel("Click to dismiss", remaining);
    const measureText =
      actionText.length >= dismissText.length ? actionText : dismissText;
    const pauseIconClassName = `sonner-custom-toast__pause-icon${
      isPaused && remaining > 0
        ? " sonner-custom-toast__pause-icon--visible"
        : ""
    }`;

    return (
      <button
        type="button"
        className="sonner-custom-toast__button"
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          onAction?.(event);
          toast.dismiss(toastId);
        }}
        disabled={disabled}
      >
        <span className="sonner-custom-toast__pause-slot" aria-hidden="true">
          <svg
            aria-hidden="true"
            className={pauseIconClassName}
            viewBox="0 0 10 10"
          >
            <rect x="1" y="1" width="3" height="8" rx="1" />
            <rect x="6" y="1" width="3" height="8" rx="1" />
          </svg>
        </span>
        <span className="sonner-custom-toast__button-label">
          <span className="sonner-custom-toast__button-action">
            {actionText}
          </span>
          <span className="sonner-custom-toast__button-dismiss">
            {dismissText}
          </span>
          <span
            className="sonner-custom-toast__button-measure"
            aria-hidden="true"
          >
            {measureText}
          </span>
        </span>
      </button>
    );
  };

  const CountdownLabel = () => {
    const [remaining, setRemaining] = useState(countdown || 0);
    const pausedRef = useRef(false);
    const [isPaused, setIsPaused] = useState(false);
    const endAtRef = useRef(0);
    const pausedAtRef = useRef(null);
    const lastRemainingRef = useRef(remaining);

    useEffect(() => {
      if (!countdown) return undefined;
      attachToasterHoverListeners();
      endAtRef.current = Date.now() + countdown * 1000;
      lastRemainingRef.current = countdown;
      setRemaining(countdown);
      const handleHoverChange = (paused) => {
        if (pausedRef.current === paused) return;
        pausedRef.current = paused;
        setIsPaused(paused);
        if (paused) {
          pausedAtRef.current = Date.now();
          return;
        }
        if (pausedAtRef.current) {
          const pausedDuration = Date.now() - pausedAtRef.current;
          endAtRef.current += pausedDuration;
          pausedAtRef.current = null;
        }
      };
      countdownSubscribers.add(handleHoverChange);
      pausedRef.current = isToasterHovered;
      setIsPaused(isToasterHovered);
      if (isToasterHovered) {
        pausedAtRef.current = Date.now();
      }

      const intervalId = setInterval(() => {
        if (pausedRef.current) return;
        const nextRemaining = Math.max(
          0,
          Math.ceil((endAtRef.current - Date.now()) / 1000)
        );
        if (nextRemaining !== lastRemainingRef.current) {
          lastRemainingRef.current = nextRemaining;
          setRemaining(nextRemaining);
        }
        if (nextRemaining <= 0) {
          clearInterval(intervalId);
          toast.dismiss(toastId);
        }
      }, 1000);

      return () => {
        clearInterval(intervalId);
        countdownSubscribers.delete(handleHoverChange);
      };
    }, []);

    return <ActionButton remaining={remaining} isPaused={isPaused} />;
  };

  return (
    <div
      className="sonner-custom-toast"
      data-type={type}
      onClick={() => toast.dismiss(toastId)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toast.dismiss(toastId);
        }
      }}
    >
      <div className="sonner-custom-toast__content">
        <div className="sonner-custom-toast__title">{title}</div>
        {description ? (
          <div className="sonner-custom-toast__detail">{description}</div>
        ) : null}
      </div>
      {actionLabel ? (
        countdown ? (
          <CountdownLabel />
        ) : (
          <ActionButton />
        )
      ) : null}
    </div>
  );
};

const showToast = ({
  id,
  title,
  description,
  actionLabel,
  onAction,
  duration,
  countdown,
  type,
}) => {
  const toastId =
    id || `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  toast.custom(
    (t) =>
      toastComponent({
        toastId: t,
        title,
        description,
        actionLabel,
        onAction,
        countdown,
        type,
      }),
    {
      id: toastId,
      duration,
    },
  );
  return toastId;
};

export const notifySuccess = (message, options = {}) => {
  const description = options.description;
  return showToast({
    title: message,
    description,
    duration: options.duration,
    type: "success",
  });
};

export const notifyError = (message, options = {}) => {
  const description = options.description;
  return showToast({
    title: message,
    description,
    duration: options.duration,
    type: "error",
  });
};

export const notifyAction = ({
  id,
  title,
  message,
  description,
  actionLabel,
  onAction,
  duration = 7000,
}) => {
  const content = title || message || "";
  const detail = description || (title ? message : undefined);
  return showToast({
    id,
    title: content,
    description: detail,
    actionLabel,
    onAction,
    duration,
    type: "action",
  });
};

export const notifyUndo = ({
  title,
  message,
  onUndo,
  duration = 5000,
  undoLabel = "Undo",
}) => {
  const content = title || message || "";
  const detail = title ? message : undefined;
  const totalSeconds = Math.max(1, Math.ceil(duration / 1000));
  const id = `undo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  showToast({
    id,
    title: content,
    description: detail,
    actionLabel: undoLabel,
    onAction: onUndo,
    duration,
    countdown: totalSeconds,
    type: "undo",
  });

  return () => toast.dismiss(id);
};
