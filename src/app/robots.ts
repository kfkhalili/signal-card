import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/workspace/", "/auth/", "/api/", "/_next/", "/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
