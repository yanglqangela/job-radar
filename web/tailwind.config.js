/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans CJK SC",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bcdfff",
          300: "#8ecbff",
          400: "#59aeff",
          500: "#328dff",
          600: "#1a6ef5",
          700: "#1558e1",
          800: "#1848b6",
          900: "#19408f",
        },
      },
      maxWidth: {
        app: "44rem",
        portfolio: "76rem",
      },
    },
  },
  plugins: [],
};
