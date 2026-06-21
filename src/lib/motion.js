// Shared Framer Motion variants. Subtle + premium: short distances, soft easing.
const EASE = [0.22, 1, 0.36, 1];

export const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export const hoverLift = {
  rest: { y: 0, transition: { duration: 0.2, ease: EASE } },
  hover: { y: -4, transition: { type: 'spring', stiffness: 300, damping: 22 } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.26, ease: EASE },
};