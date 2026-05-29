/* ──────────────────────────────────────────────────────────────────
   emergence-worklet.js — CSS Houdini paint worklet for subtle
   network-emergence backdrop. Registered via CSS.paintWorklet.
   ────────────────────────────────────────────────────────────────── */

if (typeof registerPaint !== 'undefined') {
  class Emergence {
    paint(ctx, size) {
      const { width: w, height: h } = size;
      // Sparse grid of soft nodes connected by faint lines.
      // Pseudo-random but deterministic per repaint.
      const cols = Math.ceil(w / 90);
      const rows = Math.ceil(h / 90);
      const points = [];
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          // hash for jitter
          const s = (i * 374761393 + j * 668265263) >>> 0;
          const rx = ((s & 0xff) / 255 - 0.5) * 40;
          const ry = (((s >>> 8) & 0xff) / 255 - 0.5) * 40;
          points.push({ x: i * 90 + rx, y: j * 90 + ry });
        }
      }
      ctx.strokeStyle = 'rgba(154, 167, 255, 0.18)';
      ctx.lineWidth = 1;
      for (let a = 0; a < points.length; a++) {
        for (let b = a + 1; b < points.length; b++) {
          const dx = points[a].x - points[b].x;
          const dy = points[a].y - points[b].y;
          const d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.globalAlpha = (1 - d / 130) * 0.5;
            ctx.beginPath();
            ctx.moveTo(points[a].x, points[a].y);
            ctx.lineTo(points[b].x, points[b].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(154, 167, 255, 0.45)';
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  registerPaint('emergence', Emergence);
}
