// Colours come from the blueprint. Light and dark values live in styles.css.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        card: "var(--card)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        saffron: { DEFAULT: "#F28C0F", light: "#FFB627", dark: "#B25F00" },
        forest: "#0E4A2B",
        leaf: "#1F7A3E",
        brick: "#C0392B",
      },
      fontFamily: {
        display: ['"Baloo Bhaina 2"', '"Noto Sans Oriya"', "sans-serif"],
        body: ['"Noto Sans"', '"Noto Sans Oriya"', "sans-serif"],
      },
    },
  },
};
