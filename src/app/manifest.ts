import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trade Desk",
    short_name: "Trade Desk",
    description: "Morning news briefing and BTC trade journal",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1524",
    theme_color: "#0d1524",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
