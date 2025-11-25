import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace - Tickered Financial Data Platform",
  description:
    "Build your personalized financial dashboard with Tickered Workspace. Create custom card collections, track your favorite stocks, and analyze market data with our interactive financial data visualization platform.",
  alternates: {
    canonical: "/workspace",
  },
  openGraph: {
    title: "Workspace - Tickered Financial Data Platform",
    description:
      "Build your personalized financial dashboard with Tickered Workspace. Create custom card collections and track your favorite stocks.",
    type: "website",
    url: "/workspace",
  },
  twitter: {
    card: "summary",
    title: "Workspace - Tickered",
    description:
      "Build your personalized financial dashboard with Tickered Workspace. Create custom card collections and track your favorite stocks.",
  },
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

