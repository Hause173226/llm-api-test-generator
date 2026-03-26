/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3525cd",
          container: "#4f46e5",
          fixed: "#e2dfff",
          "fixed-dim": "#c3c0ff",
        },
        on: {
          primary: {
            DEFAULT: "#ffffff",
            container: "#dad7ff",
            fixed: "#0f0069",
            "fixed-variant": "#3323cc",
          },
          secondary: {
            DEFAULT: "#ffffff",
            container: "#454386",
            fixed: "#140f54",
            "fixed-variant": "#413f82",
          },
          tertiary: {
            DEFAULT: "#ffffff",
            container: "#ffd2be",
            fixed: "#351000",
            "fixed-variant": "#7b2f00",
          },
          surface: {
            DEFAULT: "#0b1c30",
            variant: "#464555",
          },
          background: "#0b1c30",
          error: {
            DEFAULT: "#ffffff",
            container: "#93000a",
          },
        },
        secondary: {
          DEFAULT: "#58579b",
          container: "#b6b4ff",
          fixed: "#e2dfff",
          "fixed-dim": "#c3c0ff",
        },
        tertiary: {
          DEFAULT: "#7e3000",
          container: "#a44100",
          fixed: "#ffdbcc",
          "fixed-dim": "#ffb695",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          tint: "#4d44e3",
          variant: "#d3e4fe",
          container: {
            lowest: "#ffffff",
            low: "#eff4ff",
            DEFAULT: "#e5eeff",
            high: "#dce9ff",
            highest: "#d3e4fe",
          },
        },
        background: "#f8f9ff",
        outline: {
          DEFAULT: "#777587",
          variant: "#c7c4d8",
        },
        inverse: {
          surface: "#213145",
          "on-surface": "#eaf1ff",
          primary: "#c3c0ff",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
