import { existsSync } from "node:fs";
import path from "node:path";
import nextConfig from "../../../next.config";
import robots from "../robots";
import sitemap from "../sitemap";
import {
  INDEXABLE_PUBLIC_PATHS,
  NON_INDEXABLE_PUBLIC_PATHS,
  PROTECTED_PATH_PREFIXES,
  RETIRED_PUBLIC_PATHS,
} from "@/lib/search-discovery";

describe("search discovery contract", () => {
  it("advertises only useful public pages in the sitemap", () => {
    const paths = sitemap().map(({ url }) => new URL(url).pathname);
    const excludedPaths = new Set([
      ...PROTECTED_PATH_PREFIXES,
      ...NON_INDEXABLE_PUBLIC_PATHS,
    ]);

    expect(paths).toEqual([...INDEXABLE_PUBLIC_PATHS]);
    expect(paths.filter((path) => excludedPaths.has(path))).toEqual([]);
  });

  it("keeps protected product routes out of crawler discovery", () => {
    const wildcardRule = robots().rules.find(
      (rule) => rule.userAgent === "*"
    );

    expect(wildcardRule?.disallow).toEqual([...PROTECTED_PATH_PREFIXES]);
  });

  it("adds a noindex response header to every unfinished public page", async () => {
    const headerRules = (await nextConfig.headers?.()) ?? [];
    const noindexSources = headerRules
      .filter((rule) =>
        rule.headers.some(
          (header) =>
            header.key === "X-Robots-Tag" &&
            header.value === "noindex, nofollow"
        )
      )
      .map((rule) => rule.source);

    expect(noindexSources).toEqual(
      NON_INDEXABLE_PUBLIC_PATHS.map((path) => `${path}/:path*`)
    );
  });

  it("does not ship speculative product pages that have been retired", () => {
    RETIRED_PUBLIC_PATHS.forEach((retiredPath) => {
      const pageFile = path.join(
        process.cwd(),
        "src/app",
        retiredPath.slice(1),
        "page.tsx"
      );

      expect(existsSync(pageFile)).toBe(false);
    });
  });
});
