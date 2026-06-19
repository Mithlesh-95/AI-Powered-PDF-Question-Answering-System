/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brutalist: {
          bg: "#F3F0E8",      // Warm cream background
          ink: "#050816",     // Deep ink-black text and borders
          muted: "#8A8D9F",   // Muted gray-ink for subtexts
          active: "#E85D04",  // Rare accent color for active triggers
        }
      },
      fontFamily: {
        editorial: ["Syne", "Cabinet Grotesk", "Space Grotesk", "sans-serif"],
        sans: ["Space Grotesk", "Inter", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      borderWidth: {
        '3': '3px',
        '6': '6px',
      }
    },
  },
  plugins: [],
}
