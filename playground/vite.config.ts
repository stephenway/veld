import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
      // svelte-highlight uses Svelte 4 syntax ($$restProps)
      dynamicCompileOptions: ({ filename }) => (filename.includes("svelte-highlight") ? { runes: false } : {}),
    }),
  ],
  optimizeDeps: {
    exclude: ["@rasterandstate/majestic-ui"],
  },
});
