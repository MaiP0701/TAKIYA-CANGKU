import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        tea: {
          50: "#fff8ed",
          100: "#feedd0",
          200: "#fbd79a",
          300: "#f4bc61",
          400: "#ea9b33",
          500: "#de7f1e",
          600: "#c36516",
          700: "#9f4d16",
          800: "#7f3e17",
          900: "#683517"
        },
        jade: {
          50: "#edfdf6",
          100: "#d3f8e6",
          200: "#a9efd0",
          300: "#72dfb1",
          400: "#3ec58d",
          500: "#1ea873",
          600: "#10865c",
          700: "#106b4c",
          800: "#11543e",
          900: "#104634"
        }
      },
      boxShadow: {
        panel: "0 20px 45px rgba(114, 74, 27, 0.12)"
      },
      backgroundImage: {
        "tea-grid": "linear-gradient(rgba(158, 123, 70, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(158, 123, 70, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;

