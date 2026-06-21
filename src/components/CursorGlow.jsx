import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './CursorGlow.css';

/**
 * Premium cursor-reactive hero glow.
 * - Two parallax radial layers (layer 1 tracks fully, layer 2 at ~20% w/ more trail).
 * - rAF + lerp smoothing; positions written as CSS vars consumed by translate3d (GPU only).
 * - Mobile (no hover): centered, no tracking. Reduced motion: fully static.
 */
export default function CursorGlow() {
  const wrapRef = useRef(null);
  const l1Ref = useRef(null);
  const l2Ref = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const l1 = l1Ref.current;
    const l2 = l2Ref.current;
    if (!wrap || !l1 || !l2) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const noHover = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    let rect = wrap.getBoundingClientRect();
    const updateRect = () => { rect = wrap.getBoundingClientRect(); };

    // Fractional positions (0..1) within the hero box.
    let tx = 0.5, ty = 0.5;            // target (cursor)
    let x1 = 0.5, y1 = 0.5;            // layer 1 current
    let x2 = 0.5, y2 = 0.5;            // layer 2 current

    const applyLayer = (el, fx, fy) => {
      el.style.setProperty('--tx', ((fx - 0.5) * rect.width).toFixed(1) + 'px');
      el.style.setProperty('--ty', ((fy - 0.5) * rect.height).toFixed(1) + 'px');
    };

    // Static fallback: center and stop.
    if (reduce) {
      applyLayer(l1, 0.5, 0.5);
      applyLayer(l2, 0.5, 0.5);
      return undefined;
    }

    const onMove = (e) => {
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      if (fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1) { tx = fx; ty = fy; }
      else { tx = 0.5; ty = 0.5; }      // cursor left the hero -> drift to center
    };
    const onLeave = () => { tx = 0.5; ty = 0.5; };

    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      // Subtle ambient float (continues while idle).
      const ax = Math.sin(t * 0.45) * 0.02 + Math.sin(t * 0.23) * 0.012;
      const ay = Math.cos(t * 0.38) * 0.02 + Math.cos(t * 0.19) * 0.012;

      const baseX = noHover ? 0.5 : tx;
      const baseY = noHover ? 0.5 : ty;

      // Layer 1: full cursor + float. Layer 2: 20% parallax + softer float.
      const t1x = baseX + ax, t1y = baseY + ay;
      const t2x = 0.5 + (baseX - 0.5) * 0.2 + ax * 0.6;
      const t2y = 0.5 + (baseY - 0.5) * 0.2 + ay * 0.6;

      x1 += (t1x - x1) * 0.10; y1 += (t1y - y1) * 0.10;
      x2 += (t2x - x2) * 0.055; y2 += (t2y - y2) * 0.055;  // slower -> depth

      applyLayer(l1, x1, y1);
      applyLayer(l2, x2, y2);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });
    if (!noHover) {
      window.addEventListener('mousemove', onMove);
      document.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onLeave);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <motion.div
      ref={wrapRef}
      className="cursor-glow"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
    >
      <div ref={l2Ref} className="cursor-glow-layer cursor-glow-layer-2" />
      <div ref={l1Ref} className="cursor-glow-layer cursor-glow-layer-1" />
    </motion.div>
  );
}