import { useMediaQuery } from '@mantine/hooks';

/**
 * Hook to detect if viewport is mobile-sized.
 * Uses Mantine's sm breakpoint (768px / 48em).
 *
 * @returns {boolean} true if viewport width <= 768px
 */
export function useMobile() {
  // Mantine breakpoint sm = 48em = 768px
  // Returns true for mobile, false for desktop
  return useMediaQuery('(max-width: 48em)');
}
