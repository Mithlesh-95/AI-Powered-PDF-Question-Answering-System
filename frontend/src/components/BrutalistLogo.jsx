import React from 'react';

/**
 * BrutalistLogo Component
 * Renders the "DOCMIND AI" wordmark with the "O" replaced by a custom 12-block
 * pixelated diamond/circle symbol, following Lorenzo Daldosso's portfolio style.
 * Includes GPU-accelerated drift animations on hover and a high-frequency glitch effect.
 */
export default function BrutalistLogo({ className = '' }) {
  // Symmetrical 12-block hollow diamond/circle coordinate map (5x5 grid)
  // Center is (2, 2)
  const blocks = [
    // Row 0: Top cap
    { x: 2, y: 0, dx: 0, dy: -2 },
    // Row 1: Upper diagonals
    { x: 1, y: 1, dx: -1, dy: -1 },
    { x: 2, y: 1, dx: 0, dy: -1 },
    { x: 3, y: 1, dx: 1, dy: -1 },
    // Row 2: Center sides (leaving center y=2, x=2 hollow)
    { x: 0, y: 2, dx: -2, dy: 0 },
    { x: 1, y: 2, dx: -1, dy: 0 },
    { x: 3, y: 2, dx: 1, dy: 0 },
    { x: 4, y: 2, dx: 2, dy: 0 },
    // Row 3: Lower diagonals
    { x: 1, y: 3, dx: -1, dy: 1 },
    { x: 2, y: 3, dx: 0, dy: 1 },
    { x: 3, y: 3, dx: 1, dy: 1 },
    // Row 4: Bottom cap
    { x: 2, y: 4, dx: 0, dy: 2 }
  ];

  // Grid dimensions
  const cellSize = 14;
  const gap = 1;
  const viewBoxSize = 5 * cellSize + 4 * gap; // 5 * 14 + 4 * 1 = 74

  return (
    <span className={`brutalist-logo-container ${className}`}>
      {/* Self-contained styling to avoid Tailwind configuration complexities */}
      <style>{`
        .brutalist-logo-container {
          display: inline-block;
          color: #050A1A;
          user-select: none;
          cursor: pointer;
        }

        .brutalist-logo-inner {
          display: inline-flex;
          align-items: baseline;
        }

        .logo-text {
          line-height: 1;
          display: inline-block;
        }

        .logo-o-wrapper {
          display: inline-block;
          line-height: 0;
          width: 0.72em;
          height: 0.72em;
          vertical-align: -0.04em;
          margin: 0 0.05em;
        }

        .logo-o-svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
          overflow: visible;
        }

        .pixel-block {
          transform: translate3d(0, 0, 0);
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Hover animation: blocks drift outward from the center */
        .brutalist-logo-container:hover .pixel-block {
          transform: translate3d(
            calc(var(--dx) * 2px),
            calc(var(--dy) * 2px),
            0
          );
        }

        /* High-frequency brutalist glitch effect in brief bursts */
        @keyframes logo-glitch-anim {
          0% { transform: translate3d(0, 0, 0) skew(0deg); }
          1% { transform: translate3d(-1px, 0.5px, 0) skew(-0.5deg); }
          2% { transform: translate3d(1px, -0.5px, 0) skew(0.5deg); }
          3% { transform: translate3d(-0.5px, -1px, 0) skew(0.2deg); }
          4% { transform: translate3d(0.5px, 1px, 0) skew(-0.2deg); }
          5% { transform: translate3d(0, 0, 0) skew(0deg); }
          100% { transform: translate3d(0, 0, 0) skew(0deg); }
        }

        .brutalist-logo-container:hover .brutalist-logo-inner {
          animation: logo-glitch-anim 2s steps(2, end) infinite;
        }
      `}</style>

      <span className="brutalist-logo-inner">
        <span className="logo-text">D</span><span className="logo-o-wrapper"><svg
          className="logo-o-svg"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {blocks.map((b, idx) => (
            <rect
              key={idx}
              x={b.x * (cellSize + gap)}
              y={b.y * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              className="pixel-block"
              style={{
                '--dx': b.dx,
                '--dy': b.dy
              }}
            />
          ))}
        </svg></span><span className="logo-text">CMIND&nbsp;AI</span>
      </span>
    </span>
  );
}
