import { MetadataRoute } from "next";
import { INDEXABLE_PUBLIC_PATHS } from "@/lib/search-discovery";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.tickered.com";

  return INDEXABLE_PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? baseUrl : `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "yearly",
    priority: path === "/" ? 1 : 0.3,
  }));
}
