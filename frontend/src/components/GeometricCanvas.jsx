import React, { useEffect, useRef } from 'react';

export default function GeometricCanvas({ phase = 0, width = 300, height = 300 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let particles = [];
    let lines = [];
    let frame = 0;

    // Initialize particles
    const initParticles = (count) => {
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 4 + 2,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          color: '#050816',
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.05,
          pulse: Math.random() * 0.1
        });
      }
    };

    initParticles(30);

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Background styling
      ctx.fillStyle = '#F3F0E8';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines in the background
      ctx.strokeStyle = 'rgba(5, 8, 22, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#050816';
      ctx.strokeStyle = '#050816';
      ctx.lineWidth = 2;

      if (phase === 0) {
        // --- 00 IDLE: Soft Floating Particles & Node Links ---
        particles.forEach((p, idx) => {
          p.x += p.vx * 0.4;
          p.y += p.vy * 0.4;

          // Boundary bounce
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          // Draw squares instead of circles to match brutalism
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);

          // Draw links to close neighbors
          for (let j = idx + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 60) {
              ctx.strokeStyle = `rgba(5, 8, 22, ${1 - dist / 60})`;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        });

      } else if (phase === 1) {
        // --- 01 EXTRACTING: Rapid Radial Expansion ---
        const cx = width / 2;
        const cy = height / 2;
        const ringRadius = (frame * 3) % (width / 2);
        
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(5, 8, 22, 0.3)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Scatter lines outward from center
        particles.forEach((p) => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const len = Math.hypot(dx, dy);
          p.x += (dx / len) * 2;
          p.y += (dy / len) * 2;

          if (p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) {
            p.x = cx + (Math.random() - 0.5) * 20;
            p.y = cy + (Math.random() - 0.5) * 20;
          }

          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });

      } else if (phase === 2) {
        // --- 02 CHUNKING: Dividing & Splitting Grid Blocks ---
        const cols = 4;
        const rows = 4;
        const blockW = width / cols;
        const blockH = height / rows;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            // Calculate a shifting offset
            const shiftX = Math.sin(frame * 0.05 + r) * 3;
            const shiftY = Math.cos(frame * 0.05 + c) * 3;
            
            ctx.strokeStyle = '#050816';
            ctx.strokeRect(
              c * blockW + 5 + shiftX, 
              r * blockH + 5 + shiftY, 
              blockW - 10, 
              blockH - 10
            );

            // Draw a smaller fill square inside
            if ((c + r + Math.floor(frame / 20)) % 2 === 0) {
              ctx.fillRect(
                c * blockW + 15 + shiftX, 
                r * blockH + 15 + shiftY, 
                blockW - 30, 
                blockH - 30
              );
            }
          }
        }

      } else if (phase === 3) {
        // --- 03 EMBEDDING: Mathematical Vector Network Nodes ---
        const cx = width / 2;
        const cy = height / 2;
        const nodes = 8;
        const radius = 60 + Math.sin(frame * 0.05) * 10;
        const points = [];

        for (let i = 0; i < nodes; i++) {
          const angle = (i * Math.PI * 2) / nodes + frame * 0.01;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          points.push({ x, y });

          // Render crosshair markers for nodes
          ctx.beginPath();
          ctx.moveTo(x - 6, y);
          ctx.lineTo(x + 6, y);
          ctx.moveTo(x, y - 6);
          ctx.lineTo(x, y + 6);
          ctx.stroke();
        }

        // Draw connections complex mesh
        ctx.strokeStyle = 'rgba(5, 8, 22, 0.4)';
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }

        // Concentric scanning circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#E85D04'; // limited accent usage
        ctx.lineWidth = 1.5;
        ctx.stroke();

      } else if (phase === 4) {
        // --- 04 INDEXING: Cascading Binary Stack ---
        const columns = 10;
        const colW = width / columns;
        
        ctx.fillStyle = '#050816';
        for (let i = 0; i < columns; i++) {
          const blocks = 6;
          for (let j = 0; j < blocks; j++) {
            // Speed cascade offset
            const active = (Math.floor(frame / 6) + i + j) % 8;
            if (active < 4) {
              ctx.fillRect(
                i * colW + 4, 
                height - (j * 20) - 30, 
                colW - 8, 
                14
              );
            }
          }
        }

        // Draw dynamic coordinate lines
        const scanY = (frame * 2) % height;
        ctx.strokeStyle = '#E85D04';
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();

      } else if (phase === 5) {
        // --- 05 READY: Locking Grid & Success Node Indicator ---
        const padding = 40;
        ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);
        
        // Solid completed inner borders
        ctx.lineWidth = 4;
        ctx.strokeRect(padding + 8, padding + 8, width - padding * 2 - 16, height - padding * 2 - 16);
        ctx.lineWidth = 2;

        // Draw stylized geometric checkmark
        ctx.beginPath();
        ctx.moveTo(width * 0.35, height * 0.5);
        ctx.lineTo(width * 0.47, height * 0.62);
        ctx.lineTo(width * 0.68, height * 0.38);
        ctx.strokeStyle = '#050816';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.lineWidth = 2;

        // Animated lock lines at corners
        const pulse = Math.abs(Math.sin(frame * 0.08)) * 4;
        ctx.fillRect(padding - 4 - pulse, padding - 4 - pulse, 12, 12);
        ctx.fillRect(width - padding - 8 + pulse, padding - 4 - pulse, 12, 12);
        ctx.fillRect(padding - 4 - pulse, height - padding - 8 + pulse, 12, 12);
        ctx.fillRect(width - padding - 8 + pulse, height - padding - 8 + pulse, 12, 12);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [phase, width, height]);

  return (
    <div className="border-2 border-brutalist-ink bg-brutalist-bg flex items-center justify-center p-4">
      <canvas 
        ref={canvasRef} 
        style={{ width: `${width}px`, height: `${height}px` }}
        className="block"
      />
    </div>
  );
}
