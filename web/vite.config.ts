import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 默认用相对路径：本地预览与 GitHub Pages 项目站点都能直接工作（配合 HashRouter）
// CI 可通过 VITE_BASE=/<repo>/ 覆盖；用户站点/自定义域名也可设为 /
const base = process.env.VITE_BASE || "./";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
