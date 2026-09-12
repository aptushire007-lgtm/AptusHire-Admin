import React, { useEffect, useRef } from "react";
import { Sparkles, Bot } from "lucide-react";

/**
 * ThreeDLoader - Sleek 3D AI Generation Animation
 *
 * Combines:
 * 1. An interactive 3D perspective Canvas with revolving depth-sorted particles.
 * 2. Three nested CSS 3D gyroscopic orbital rings with glowing gradient trails.
 * 3. A pulsing glowing neural core with ambient radial lighting.
 * 4. Contextual live title, subtitle, and badge.
 */
export default function ThreeDLoader({
  title = "AI Engine Generating...",
  subtitle = "Synthesizing competencies and test items",
  progress = null,
  size = "md",
  tone = "emerald",
}) {
  const canvasRef = useRef(null);

  const colors = {
    emerald: {
      core: "from-emerald-500/30 via-[#0E3B2E]/40 to-transparent",
      ring1: "border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.35)]",
      ring2: "border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.3)]",
      ring3: "border-emerald-300/50 shadow-[0_0_10px_rgba(110,231,183,0.25)]",
      particleA: "#10B981",
      particleB: "#14B8A6",
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      accent: "text-emerald-700",
    },
    blue: {
      core: "from-blue-500/30 via-indigo-600/40 to-transparent",
      ring1: "border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.35)]",
      ring2: "border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]",
      ring3: "border-sky-300/50 shadow-[0_0_10px_rgba(125,211,252,0.25)]",
      particleA: "#3B82F6",
      particleB: "#06B6D4",
      badge: "bg-blue-50 text-blue-800 border-blue-200",
      accent: "text-blue-700",
    },
    amber: {
      core: "from-amber-500/30 via-orange-600/40 to-transparent",
      ring1: "border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.35)]",
      ring2: "border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)]",
      ring3: "border-amber-300/50 shadow-[0_0_10px_rgba(252,211,77,0.25)]",
      particleA: "#F59E0B",
      particleB: "#FBBF24",
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      accent: "text-amber-700",
    },
  }[tone] || {
    core: "from-emerald-500/30 via-[#0E3B2E]/40 to-transparent",
    ring1: "border-emerald-500/70",
    ring2: "border-teal-400/60",
    ring3: "border-emerald-300/50",
    particleA: "#10B981",
    particleB: "#14B8A6",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    accent: "text-emerald-700",
  };

  const orbDimensions = {
    sm: { box: "w-20 h-20", ring1: 70, ring2: 56, ring3: 42, canvas: 90 },
    md: { box: "w-28 h-28", ring1: 96, ring2: 78, ring3: 60, canvas: 130 },
    lg: { box: "w-36 h-36", ring1: 120, ring2: 98, ring3: 76, canvas: 160 },
  }[size] || { box: "w-28 h-28", ring1: 96, ring2: 78, ring3: 60, canvas: 130 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;

    let animId;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    const count = 42;
    const particles = [];
    const baseRadius = width * 0.32;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = baseRadius * (0.8 + Math.random() * 0.4);
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: Math.random() * 1.8 + 0.8,
        color: Math.random() > 0.4 ? colors.particleA : colors.particleB,
        alpha: Math.random() * 0.6 + 0.3,
      });
    }

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, baseRadius);
      grad.addColorStop(0, "rgba(16, 185, 129, 0.22)");
      grad.addColorStop(0.6, "rgba(20, 184, 166, 0.08)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      angle += 0.022;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt = 0.45;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      const projected = particles.map((p) => {
        const x1 = p.x * cosA - p.z * sinA;
        const z1 = p.x * sinA + p.z * cosA;
        const y1 = p.y * cosT - z1 * sinT;
        const z2 = p.y * sinT + z1 * cosT;

        const fov = 140;
        const scale = fov / (fov + z2 + 60);
        const px = cx + x1 * scale;
        const py = cy + y1 * scale;
        const alpha = Math.max(0.15, Math.min(1, ((z2 + 60) / 120) * p.alpha));

        return { px, py, scale, z: z2, alpha, color: p.color, size: p.size };
      });

      projected.sort((a, b) => a.z - b.z);

      projected.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(0.5, p.size * p.scale), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [colors.particleA, colors.particleB]);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <div
        className={`relative flex items-center justify-center ${orbDimensions.box}`}
        style={{ perspective: "600px" }}
      >
        <canvas
          ref={canvasRef}
          width={orbDimensions.canvas}
          height={orbDimensions.canvas}
          className="absolute inset-0 m-auto pointer-events-none"
        />

        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className={`absolute rounded-full border-2 border-dashed ${colors.ring1}`}
            style={{
              width: `${orbDimensions.ring1}px`,
              height: `${orbDimensions.ring1}px`,
              animation: "threeDSpinX 4s linear infinite",
            }}
          />
          <div
            className={`absolute rounded-full border border-dotted ${colors.ring2}`}
            style={{
              width: `${orbDimensions.ring2}px`,
              height: `${orbDimensions.ring2}px`,
              animation: "threeDSpinY 6s linear infinite reverse",
            }}
          />
          <div
            className={`absolute rounded-full border ${colors.ring3}`}
            style={{
              width: `${orbDimensions.ring3}px`,
              height: `${orbDimensions.ring3}px`,
              animation: "threeDSpinZ 8s linear infinite",
            }}
          />
        </div>

        <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-xs border border-white">
          <Bot className={`h-5 w-5 ${colors.accent} animate-pulse`} />
        </div>
      </div>

      <div className="mt-3.5 space-y-1 max-w-sm">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider shadow-2xs bg-white">
          <Sparkles className={`h-3 w-3 ${colors.accent} animate-spin`} />
          <span className={colors.accent}>Neural Synthesis Active</span>
        </div>

        <h4 className="text-sm font-bold text-slate-900 tracking-tight">
          {title}
        </h4>

        {subtitle && (
          <p className="text-xs text-slate-500 leading-relaxed">
            {subtitle}
          </p>
        )}

        {progress && (
          <div className="pt-1">
            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 font-mono">
              {progress}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes threeDSpinX {
          0% { transform: rotateX(65deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(65deg) rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes threeDSpinY {
          0% { transform: rotateX(25deg) rotateY(0deg) rotateZ(45deg); }
          100% { transform: rotateX(25deg) rotateY(360deg) rotateZ(405deg); }
        }
        @keyframes threeDSpinZ {
          0% { transform: rotateX(75deg) rotateY(45deg) rotateZ(0deg); }
          100% { transform: rotateX(75deg) rotateY(45deg) rotateZ(360deg); }
        }
      `}</style>
    </div>
  );
}
