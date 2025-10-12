import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/workspace/",
          "/compass/",
          "/auth/",
          "/api/",
          "/_next/",
          "/admin/",
          "/profile/",
          "/settings/",
        ],
      },
      {
        // Disallow common AI crawlers
        userAgent: [
          "GPTBot",
          "Google-Extended",
          "CCBot",
          "anthropic-ai",
          "cohere-ai",
          "omgili",
          "omgilibot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
