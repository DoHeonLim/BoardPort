import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "보드포트",
    short_name: "보드포트",
    description: "보드게임과 TRPG 중고거래 및 커뮤니티 플랫폼",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#1E40AF",
    orientation: "portrait",
    id: "/",
    scope: "/",
    categories: ["games", "shopping"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/images/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
