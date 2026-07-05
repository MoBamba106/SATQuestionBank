import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft Paper v6 – user-confirmed preference
        paper: {
          DEFAULT: "#faf8f3",
          50: "#fffefb",
          100: "#faf8f3",
          200: "#f5f1e8",
          300: "#e9e2d0",
          400: "#d8cfbd",
          ink: "#2b2b2a",
          inkSoft: "#5a5753",
          inkFaint: "#8a8680",
          line: "#e5dfd2",
        },
        bg: {
          950: "#faf8f3",
          900: "#f5f1e8",
          850: "#ede7d8",
          primary: "#faf8f3",
          secondary: "#f5f1e8",
        },
        ink: {
          DEFAULT: "#2b2b2a",
          soft: "#5a5753",
          faint: "#8a8680",
        },
        // keep neon keys for compat, map to soft accent
        neon: {
          cyan: "#3a6fe3",
          blue: "#3a6fe3",
          purple: "#7d5ae6",
          green: "#2ca974",
          pink: "#e56a8a",
          amber: "#d4a31a",
        },
        highlight: {
          yellow: "#fff3a3",
          mint: "#c8f5d9",
          pink: "#ffd6e7",
          blue: "#c9e8ff",
          lavender: "#e3d4ff",
          peach: "#ffe4cc",
        },
        surface: {
          glass: "rgba(255,255,255,0.9)",
          glass2: "rgba(255,255,255,0.96)",
          border: "rgba(60,45,20,0.14)",
          paper: "#ffffff",
          paperSoft: "#fdfcfa",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Fraunces', 'Sora', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        'neon-cyan': '0 4px 16px rgba(58,111,227,0.10)',
        'neon-purple': '0 4px 16px rgba(125,90,230,0.10)',
        'neon-green': '0 4px 16px rgba(44,169,116,0.10)',
        'glass': '0 6px 24px rgba(60,45,20,0.07), 0 1px 0 rgba(255,255,255,0.95) inset',
        'paper': '0 2px 12px rgba(60,45,20,0.06)',
        'paper-lg': '0 12px 36px rgba(60,45,20,0.09)',
      },
      backgroundImage: {
        'paper-texture': `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.018'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
};
export default config;
