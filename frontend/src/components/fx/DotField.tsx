import React, { useEffect, useRef } from 'react';

interface DotFieldProps {
  className?: string;
  dotColor?: string;
  glowColor?: string;
  spacing?: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  opacity: number;
}

export const DotField: React.FC<DotFieldProps> = ({
  className = '',
  dotColor = 'rgba(245, 239, 224, 0.12)',
  glowColor = 'rgba(217, 164, 65, 0.45)',
  spacing = 28,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let animFrameId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Mouse state
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      isHovered: false,
    };

    const ripples: Ripple[] = [];

    // Dot grid structure
    interface Dot {
      baseX: number;
      baseY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
    }
    let dots: Dot[] = [];

    const initDots = () => {
      dots = [];
      const cols = Math.floor(width / spacing) + 2;
      const rows = Math.floor(height / spacing) + 2;
      const startX = (width - (cols - 1) * spacing) / 2;
      const startY = (height - (rows - 1) * spacing) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = startX + c * spacing;
          const y = startY + r * spacing;
          dots.push({
            baseX: x,
            baseY: y,
            x,
            y,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      initDots();
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouse.isHovered = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      ripples.push({
        x: clickX,
        y: clickY,
        radius: 0,
        maxRadius: Math.min(width, height) * 0.6,
        strength: 22,
        opacity: 0.8,
      });
    };

    const parentElem = canvas.parentElement;
    if (parentElem) {
      parentElem.addEventListener('mousemove', handleMouseMove, { passive: true });
      parentElem.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      parentElem.addEventListener('click', handleClick, { passive: true });
    }

    // IntersectionObserver to pause loop offscreen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animFrameId) {
          render();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // Render loop
    const render = () => {
      if (!isVisible) return;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // Update and draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.radius += 5;
        rip.strength *= 0.94;
        rip.opacity *= 0.95;

        if (rip.radius > rip.maxRadius || rip.opacity < 0.01) {
          ripples.splice(i, 1);
        }
      }

      // Physics constants
      const maxDist = 95;
      const maxDistSq = maxDist * maxDist;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        if (!prefersReducedMotion) {
          // Cursor repulsion
          const dx = dot.x - mouse.x;
          const dy = dot.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / maxDist) * 16;
            dot.vx += (dx / dist) * force;
            dot.vy += (dy / dist) * force;
          }

          // Ripple shockwave impact
          for (let r = 0; r < ripples.length; r++) {
            const rip = ripples[r];
            const rdx = dot.x - rip.x;
            const rdy = dot.y - rip.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
            const waveDiff = Math.abs(rdist - rip.radius);

            if (waveDiff < 35 && rdist > 0) {
              const waveForce = (1 - waveDiff / 35) * rip.strength;
              dot.vx += (rdx / rdist) * waveForce;
              dot.vy += (rdy / rdist) * waveForce;
            }
          }

          // Spring return to base coordinates
          const spring = 0.08;
          const friction = 0.82;
          dot.vx += (dot.baseX - dot.x) * spring;
          dot.vy += (dot.baseY - dot.y) * spring;
          dot.vx *= friction;
          dot.vy *= friction;
          dot.x += dot.vx;
          dot.y += dot.vy;
        }

        // Draw dot with proximity glow
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const distNear = Math.sqrt(dx * dx + dy * dy);
        const nearRatio = Math.max(0, 1 - distNear / 120);

        ctx.beginPath();
        const baseRadius = 1.35;
        const r = baseRadius + nearRatio * 1.5;
        ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);

        if (nearRatio > 0.05) {
          ctx.fillStyle = glowColor;
          ctx.shadowColor = 'rgba(217, 164, 65, 0.6)';
          ctx.shadowBlur = nearRatio * 6;
        } else {
          ctx.fillStyle = dotColor;
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      }

      ctx.shadowBlur = 0;

      if (!prefersReducedMotion) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render();
    } else {
      animFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (parentElem) {
        parentElem.removeEventListener('mousemove', handleMouseMove);
        parentElem.removeEventListener('mouseleave', handleMouseLeave);
        parentElem.removeEventListener('click', handleClick);
      }
    };
  }, [dotColor, glowColor, spacing]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default DotField;
