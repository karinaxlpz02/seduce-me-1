import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: path.join(root, "public/6/assets-build"),
    lib: {
      entry: path.join(root, "public/6/app.js"),
      formats: ["es"],
      fileName: "app"
    },
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
});
