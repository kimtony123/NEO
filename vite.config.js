import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.tsx",
    }),
  ],

  server: {
    watch: {
      usePolling: true,
    },
  },
  // If you have a specific base path, you can set it here
  base: "/",
});
