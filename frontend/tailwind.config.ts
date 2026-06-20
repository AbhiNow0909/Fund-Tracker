import type { Config } from "tailwindcss";

/**
 * Design tokens extracted directly from wireframe/extracted.html
 * (light, Windows-11 / Fluent-inspired theme). See CLAUDE.md Section 5.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#f9f9f9",
        chrome: "#eaeaea", // sidebar / title bar
        card: "#ffffff",
        accent: "#005FB8", // Windows/Fluent blue
        "accent-hover": "#1a6fc4",
        gain: "#0f7b0f", // Windows green
        loss: "#c42b1c", // Windows red
        ink: {
          DEFAULT: "#1a1a1a", // text primary
          secondary: "#5e5e5e",
          muted: "#707070",
          faint: "#909090",
        },
        pill: "#f0f0f0",
      },
      fontFamily: {
        sans: [
          "'Segoe UI Variable Text'",
          "'Segoe UI'",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "8px",
        nav: "5px",
        pill: "4px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04)",
        pill: "0 1px 2px rgba(0,0,0,0.08)",
      },
      maxWidth: {
        content: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
