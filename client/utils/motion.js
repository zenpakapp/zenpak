// The visitor asked the system for less motion.
export function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Scrolling the page to a place: a jump when motion is reduced, a glide otherwise.
export function scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
}
