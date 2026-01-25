import { Affix, ActionIcon, Transition } from "@mantine/core";
import { useMobile } from "../../hooks/useMobile";

/**
 * Floating action button for creating issues on mobile.
 * Positioned in bottom-right corner, respects safe area insets.
 */
export function FloatingActionButton({ onClick, disabled }) {
  const isMobile = useMobile();

  // Only render on mobile
  if (!isMobile) return null;

  return (
    <Affix
      position={{ bottom: 20, right: 20 }}
      zIndex={100}
      style={{
        // Respect safe area inset for bottom
        bottom: 'max(20px, calc(20px + var(--safe-bottom)))',
        right: 'max(20px, calc(20px + var(--safe-right)))',
      }}
    >
      <Transition
        mounted={isMobile}
        transition="slide-up"
        duration={200}
        timingFunction="ease"
      >
        {(transitionStyles) => (
          <ActionIcon
            style={transitionStyles}
            onClick={onClick}
            disabled={disabled}
            size={60}
            radius="xl"
            color="blue"
            variant="filled"
            aria-label="Create new issue"
            className="fab-button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </ActionIcon>
        )}
      </Transition>
    </Affix>
  );
}
