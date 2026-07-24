import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  // Use relative asset paths so the app works on GitHub Pages project URLs.
  base: "./",
});
