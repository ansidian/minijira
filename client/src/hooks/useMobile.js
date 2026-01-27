import { useMediaQuery } from '@mantine/hooks';

/**
 * Hook to detect if viewport is mobile-sized.
 * Uses Mantine's sm breakpoint (768px / 48em).
 *
 * @returns {boolean} true if viewport width <= 768px
 */
export function useMobile() {
  // Get initial value synchronously to avoid flash
  const getInitialValue = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(max-width: 48em)').matches;
    }
    return false;
  };

  // Mantine breakpoint sm = 48em = 768px
  return useMediaQuery('(max-width: 48em)', getInitialValue(), {
    getInitialValueInEffect: false,
  });
}
