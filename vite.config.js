import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend the dev server proxies to; e.g. API_TARGET=http://localhost:3000 for a local one.
const API_TARGET = process.env.API_TARGET || "https://mobilelens.duckdns.org";

export default defineConfig({
  plugins: [react()],

  // "/" for the custom domain; set BASE_PATH=/<repo>/ if served from <user>.github.io/<repo>/.
  base: process.env.BASE_PATH || "/",

  server: {
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },

      "/media": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
