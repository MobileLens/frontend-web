/*
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://mobilelens.duckdns.org',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
*/

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "https://mobilelens.duckdns.org",
        changeOrigin: true,
        secure: false,
      },

      "/media": {
        target: "https://mobilelens.duckdns.org",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});