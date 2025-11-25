import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tickered - Financial Data Platform",
    short_name: "Tickered",
    description:
      "Institutional-grade financial data API with real-time market feeds and enterprise market services",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/images/tickered.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/tickered.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "business", "productivity"],
    lang: "en",
    dir: "ltr",
  };
}

