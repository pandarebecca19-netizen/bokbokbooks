/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF6F1",
        card: "#FFFFFF",
        ink: "#3A2E2B",
        muted: "#8B7873",
        rose: {
          50: "#FDF3F1",
          100: "#F9E3DF",
          300: "#EFC0B8",
          400: "#E7A9A3",
          500: "#D98C86",
          600: "#C97B77",
          700: "#B36560",
        },
        oak: {
          light: "#F1E4C8",
          DEFAULT: "#E6CDA0",
          dark: "#CBAA7C",
          deep: "#AE8B60",
        },
        navy: {
          DEFAULT: "#2C2A30",
          deep: "#1F1D22",
        },
        peach: {
          100: "#FBE4D8",
          300: "#F3C3AC",
          400: "#EEAD8E",
          500: "#E8967A",
        },
        sage: {
          400: "#9FBF98",
          500: "#84AC7C",
        },
        amber: {
          400: "#E3B36B",
        },
      },
      fontFamily: {
        serif: ["'Noto Serif KR'", "serif"],
        sans: ["Pretendard", "'Noto Sans KR'", "sans-serif"],
      },
      borderRadius: {
        xl2: "20px",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(58, 46, 43, 0.08)",
        card: "0 4px 16px rgba(58, 46, 43, 0.06)",
      },
    },
  },
  corePlugins: {
    // Tailwind auto-generates a `shadow-{colorName}` utility for every theme
    // color, including our "card" color (#FFFFFF) — that utility collides
    // with (and, by source order, silently overrides) our custom shadow-card
    // shape utility, turning every card's shadow invisible/white. Nothing in
    // this app tints shadow color directly, so disable that plugin.
    boxShadowColor: false,
  },
  plugins: [],
};
