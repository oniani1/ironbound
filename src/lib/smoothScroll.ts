import Lenis from 'lenis'

let lenis: Lenis | null = null

/**
 * Inertial page scrolling on desktop pointers. Off for touch (native momentum is better)
 * and for reduced motion. Overlays mark themselves with data-lenis-prevent, so wheel
 * events inside them never move the page underneath.
 */
export function startSmoothScroll() {
  if (lenis || typeof window === 'undefined') return () => {}
  const fine = window.matchMedia('(pointer: fine)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!fine || reduced) return () => {}
  lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.9, prevent: (node) => !!node.closest?.('[data-lenis-prevent]') })
  let raf = 0
  const loop = (time: number) => {
    lenis?.raf(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => {
    cancelAnimationFrame(raf)
    lenis?.destroy()
    lenis = null
  }
}

/** Jump to the top without an animation, keeping Lenis in sync. */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true })
  else window.scrollTo({ top: 0 })
}
