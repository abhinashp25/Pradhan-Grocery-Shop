import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png"],
      manifest: {
        name: "Pradhan Grocery Store",
        short_name: "Pradhan",
        description: "See what is in our shop and the price. Make your list, then come to the shop.",
        start_url: "/",
        display: "standalone",
        background_color: "#FFF8EC",
        theme_color: "#0E4A2B",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Shop data: show the saved copy at once, refresh it in the background.
            urlPattern: /\/rest\/v1\/(categories|products|product_sizes|shop_settings|services)/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "shop-data" },
          },
          {
            urlPattern: /\/storage\/v1\/object\/public\/product-photos\//,
            handler: "CacheFirst",
            options: { cacheName: "product-photos", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
});
