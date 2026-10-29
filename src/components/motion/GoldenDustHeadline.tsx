"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

interface GoldenDustHeadlineProps {
  line1: string;
  line2: string;
  className?: string;
  onCycleComplete?: () => void;
  autoCycle?: boolean;
}

interface Particle {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  baseRadius: number;
  curRadius: number;
  curAlpha: number;
  rgb: [number, number, number];
  entranceDelay: number;
  disintegrateThreshold: number;
  driftVx: number;
  driftVy: number;
  seed: number;
  isAccentGlint: boolean;
}

// Curated luxury metallic gold palette
const METALLIC_GOLD_PALETTE: [number, number, number][] = [
  [255, 248, 224], // Bright diamond highlight
  [245, 222, 142], // Champagne gold
  [224, 196, 122], // Warm pale gold
  [212, 175, 55],  // Classic 24k gold
  [180, 142, 65],  // Antique bronze gold
];

const ENTRANCE_DURATION = 1500;
const HOLD_DURATION = 2200;
const DISINTEGRATE_DURATION = 1900;
const PAUSE_DURATION = 500;
const TOTAL_CYCLE = ENTRANCE_DURATION + HOLD_DURATION + DISINTEGRATE_DURATION + PAUSE_DURATION;

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

export function GoldenDustHeadline({
  line1,
  line2,
  className,
  onCycleComplete,
  autoCycle = true,
}: GoldenDustHeadlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const [isReady, setIsReady] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
  const [cycleCount, setCycleCount] = useState(0);

  

  // Compute responsive font size matching Tailwind breakpoints
  const getFontSize = useCallback((width: number) => {
    if (width >= 1280) return 72;
    if (width >= 1024) return 64;
    if (width >= 640) return 56;
    if (width >= 420) return 42;
    return 34;
  }, []);

  // Sample letter pixels from offscreen canvas
  const sampleTextParticles = useCallback(
    (width: number, height: number, dpr: number) => {
      if (width <= 0 || height <= 0) return [];

      const offscreen = document.createElement("canvas");
      const scaledWidth = Math.ceil(width * dpr);
      const scaledHeight = Math.ceil(height * dpr);
      offscreen.width = scaledWidth;
      offscreen.height = scaledHeight;

      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return [];

      offCtx.scale(dpr, dpr);

      const fontSize = getFontSize(width);
      const lineHeight = fontSize * 1.1;
      const line1Y = fontSize * 0.95;
      const line2Y = line1Y + lineHeight;

      // Draw Line 1 (Warm Ivory)
      offCtx.font = `300 ${fontSize}px var(--font-cormorant), "Cormorant Garamond", Georgia, serif`;
      offCtx.fillStyle = "#F8F5EF";
      offCtx.textBaseline = "alphabetic";
      offCtx.fillText(line1, 0, line1Y);

      // Draw Line 2 (Champagne Gold Italic)
      offCtx.font = `italic 300 ${fontSize}px var(--font-cormorant), "Cormorant Garamond", Georgia, serif`;
      offCtx.fillStyle = "#E0C892";
      offCtx.fillText(line2, 0, line2Y);

      const imageData = offCtx.getImageData(0, 0, scaledWidth, scaledHeight);
      const data = imageData.data;

      // Density step: 2.4px on desktop, 3.4px on mobile
      const stepCss = width < 640 ? 3.2 : 2.5;
      const stepPx = Math.max(1, Math.round(stepCss * dpr));

      const particles: Particle[] = [];

      for (let y = 0; y < scaledHeight; y += stepPx) {
        for (let x = 0; x < scaledWidth; x += stepPx) {
          const idx = (y * scaledWidth + x) * 4;
          const alpha = data[idx + 3] ?? 0;

          // Sample pixels containing text glyph geometry
          if (alpha > 110) {
            const targetX = x / dpr;
            const targetY = y / dpr;

            // Pick metallic gold palette with specular highlights
            const paletteIdx = Math.floor(Math.random() * METALLIC_GOLD_PALETTE.length);
            const isGlint = Math.random() < 0.12;
            const fallbackRgb: [number, number, number] = [201, 169, 110];
            const rgb = (isGlint ? METALLIC_GOLD_PALETTE[0] : METALLIC_GOLD_PALETTE[paletteIdx]) ?? fallbackRgb;

            // Scattered origin for Convergence Entrance
            const scatterAngle = Math.random() * Math.PI * 2;
            const scatterDist = 120 + Math.random() * 260;
            const originX = targetX + Math.cos(scatterAngle) * scatterDist + (Math.random() - 0.5) * 60;
            const originY = targetY + Math.sin(scatterAngle) * scatterDist - (40 + Math.random() * 80);

            // Staggered entrance timing
            const entranceDelay = Math.random() * 450;

            // Avengers Endgame wave threshold (diagonal sweep from right to left with organic noise)
            const noise = (Math.random() - 0.5) * 0.18;
            const normalizedX = targetX / width;
            const normalizedY = targetY / height;
            // Wave sweeps predominantly left-to-right & bottom-to-top like ash lifting into the wind
            const disintegrateThreshold = Math.min(
              0.92,
              Math.max(0.04, normalizedX * 0.65 + (1 - normalizedY) * 0.2 + noise)
            );

            // Disintegration lift & drift velocities
            const driftAngle = -Math.PI / 2 + (Math.random() - 0.4) * 0.9; // Upward and slightly rightward
            const speed = 1.2 + Math.random() * 2.2;
            const driftVx = Math.cos(driftAngle) * speed + 0.8;
            const driftVy = Math.sin(driftAngle) * speed - 1.2;

            particles.push({
              targetX,
              targetY,
              x: originX,
              y: originY,
              originX,
              originY,
              baseRadius: 0.9 + Math.random() * 1.3,
              curRadius: 0.9,
              curAlpha: 0,
              rgb,
              entranceDelay,
              disintegrateThreshold,
              driftVx,
              driftVy,
              seed: Math.random() * 100,
              isAccentGlint: isGlint,
            });
          }
        }
      }

      return particles;
    },
    [getFontSize, line1, line2]
  );

  // Initialize and rebuild particles whenever lines or dimensions change
  const initSimulation = useCallback(async () => {
    if (!containerRef.current || !canvasRef.current) return;

    // Ensure custom web fonts are rendered before sampling
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const fontSize = getFontSize(width);
    const height = Math.ceil(fontSize * 2.35);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dimensionsRef.current = { width, height, dpr };

    const canvas = canvasRef.current;
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const particles = sampleTextParticles(width, height, dpr);
    particlesRef.current = particles;
    startTimeRef.current = performance.now();
    setIsReady(true);
  }, [getFontSize, sampleTextParticles]);

  // Main animation frame loop
  useEffect(() => {
    if (reducedMotion || !isReady) return;

    let isMounted = true;

    const render = (now: number) => {
      if (!isMounted) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height, dpr } = dimensionsRef.current;
      if (width <= 0 || height <= 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const elapsed = now - startTimeRef.current;
      const cycleTime = elapsed % TOTAL_CYCLE;

      // Phase 1: Convergence Entrance (0 - 1500ms)
      if (cycleTime < ENTRANCE_DURATION) {
        const t = cycleTime;
        const particles = particlesRef.current;

        for (const p of particles) {
          const localT = Math.max(0, Math.min(1, (t - p.entranceDelay) / (ENTRANCE_DURATION - 400)));

          // Smooth cubic ease-out
          const ease = 1 - Math.pow(1 - localT, 3);

          // Organic spiral curl towards letter pixel
          const curl = (1 - ease) * Math.sin(localT * Math.PI + p.seed) * 14;
          p.x = p.originX + (p.targetX - p.originX) * ease + curl;
          p.y = p.originY + (p.targetY - p.originY) * ease + curl;
          p.curAlpha = Math.min(1, ease * 1.4);
          p.curRadius = p.baseRadius * (0.5 + 0.5 * ease);

          // Render particle
          ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${p.curAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.curRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Phase 2: Assembled Solid Readable Typography (1500 - 3700ms)
      else if (cycleTime < ENTRANCE_DURATION + HOLD_DURATION) {
        const holdTime = cycleTime - ENTRANCE_DURATION;
        const particles = particlesRef.current;

        // Draw solid crisp typography
        const fontSize = getFontSize(width);
        const lineHeight = fontSize * 1.1;
        const line1Y = fontSize * 0.95;
        const line2Y = line1Y + lineHeight;

        ctx.font = `300 ${fontSize}px var(--font-cormorant), "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = "#F8F5EF";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(line1, 0, line1Y);

        ctx.font = `italic 300 ${fontSize}px var(--font-cormorant), "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = "#E0C892";
        ctx.fillText(line2, 0, line2Y);

        // Subtle ambient starlight glints across the metallic letters
        const shimmerX = (holdTime / HOLD_DURATION) * (width + 100) - 50;

        for (const p of particles) {
          p.x = p.targetX;
          p.y = p.targetY;

          // Catch shimmering gold reflection
          const distToShimmer = Math.abs(p.targetX - shimmerX);
          if (distToShimmer < 35 && p.isAccentGlint) {
            const glintAlpha = (1 - distToShimmer / 35) * 0.7;
            ctx.fillStyle = `rgba(255, 245, 210, ${glintAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.baseRadius * 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // Phase 3: Avengers Endgame Particle Disintegration (3700 - 5600ms)
      else if (cycleTime < ENTRANCE_DURATION + HOLD_DURATION + DISINTEGRATE_DURATION) {
        const disintegrateTime = cycleTime - (ENTRANCE_DURATION + HOLD_DURATION);
        const waveProgress = Math.min(1, disintegrateTime / (DISINTEGRATE_DURATION - 200));

        const particles = particlesRef.current;
        const fontSize = getFontSize(width);
        const lineHeight = fontSize * 1.1;
        const line1Y = fontSize * 0.95;
        const line2Y = line1Y + lineHeight;

        // Draw remaining solid text clipped by disintegration wave
        ctx.save();
        ctx.beginPath();
        // Clip area where letters have NOT yet disintegrated
        const clipX = width * (1 - waveProgress * 1.15);
        ctx.rect(0, 0, Math.max(0, clipX), height);
        ctx.clip();

        ctx.font = `300 ${fontSize}px var(--font-cormorant), "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = "#F8F5EF";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(line1, 0, line1Y);

        ctx.font = `italic 300 ${fontSize}px var(--font-cormorant), "Cormorant Garamond", Georgia, serif`;
        ctx.fillStyle = "#E0C892";
        ctx.fillText(line2, 0, line2Y);
        ctx.restore();

        // Render disintegrating golden dust particles lifting from actual letter shapes
        for (const p of particles) {

          // Particle still attached to letter
          if (waveProgress < p.disintegrateThreshold) {
            // Draw particle as part of letter boundary
            p.x = p.targetX;
            p.y = p.targetY;
            p.curAlpha = 0.9;
            p.curRadius = p.baseRadius;

            ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${p.curAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.curRadius, 0, Math.PI * 2);
            ctx.fill();
          }
          // Particle has detached and is disintegrating into golden dust
          else {
            const dt = (waveProgress - p.disintegrateThreshold) / (1 - p.disintegrateThreshold + 0.0001);

            // Upward drift + horizontal astral breeze
            const timeOffset = dt * 1.8;
            const turbulence = Math.sin(timeOffset * 5 + p.seed) * 2.5;

            p.x = p.targetX + (p.driftVx * dt * 90) + turbulence;
            p.y = p.targetY + (p.driftVy * dt * 85);

            // Natural fade-out and dust dispersion
            p.curAlpha = Math.max(0, 1 - Math.pow(dt, 1.3));
            p.curRadius = Math.max(0.3, p.baseRadius * (1 - dt * 0.45));

            if (p.curAlpha > 0.01) {
              ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, ${p.curAlpha})`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.curRadius, 0, Math.PI * 2);
              ctx.fill();

              // Subtle micro-glow for accent particles
              if (p.isAccentGlint && p.curAlpha > 0.4) {
                ctx.fillStyle = `rgba(255, 235, 170, ${p.curAlpha * 0.4})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.curRadius * 1.8, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }
      // Phase 4: Dispersion Pause (5600 - 6100ms)
      else {
        // Particles have vanished completely into celestial space
        const pauseTime = cycleTime - (ENTRANCE_DURATION + HOLD_DURATION + DISINTEGRATE_DURATION);

        // Near end of pause, signal cycle complete to parent (e.g. advance slide)
        if (pauseTime > PAUSE_DURATION - 50) {
          if (autoCycle && onCycleComplete && cycleCount === 0) {
            setCycleCount((prev) => prev + 1);
            onCycleComplete();
          }
        }
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReady, reducedMotion, getFontSize, line1, line2, autoCycle, onCycleComplete, cycleCount]);

  // Setup ResizeObserver and re-initialize on font/props update
  useEffect(() => {
    initSimulation();

    if (!containerRef.current) return;

    const ro = new ResizeObserver(() => {
      initSimulation();
    });

    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [initSimulation, line1, line2]);

  // Manual replay on click
  const triggerReplay = () => {
    startTimeRef.current = performance.now();
    setCycleCount(0);
  };

  return (
    <div
      ref={containerRef}
      onClick={triggerReplay}
      className={cn("relative w-full cursor-pointer select-none", className)}
      title="Click to replay Golden Dusting effect"
    >
      {/* Semantic Accessible Headline in the DOM for SEO and screen readers */}
      <h1
        className={cn(
          "font-display text-4xl sm:text-6xl xl:text-7xl font-light tracking-tight leading-[1.08] transition-opacity duration-300",
          !reducedMotion && isReady ? "opacity-0 pointer-events-none" : "text-ivory"
        )}
        aria-label={`${line1} ${line2}`}
      >
        <span className="block">{line1}</span>
        <span className="block italic text-gold-soft">{line2}</span>
      </h1>

      {/* Cinematic Golden Dust Particle Canvas */}
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-10"
        />
      )}
    </div>
  );
}
