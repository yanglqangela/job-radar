import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 项目站点部署在 /<repo>/ 下；用户站点或自定义域名时设 VITE_BASE=/
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
