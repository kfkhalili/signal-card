import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// This would be a new component you create to hold the tabs
// import { SymbolViewTabs } from "@/components/workspace/SymbolViewTabs";
// You would also import the specific content component, e.g., RevenueCardContent
// import { RevenueCardContent } from "@/components/game/cards/revenue-card/RevenueCardContent";

interface SymbolPageProps {
  params: Promise<{
    symbol: string;
    view: string;
  }>;
}

// 1. DYNAMIC METADATA GENERATION
export async function generateMetadata({
  params,
}: SymbolPageProps): Promise<Metadata> {
  const supabase = await createSupabaseServerClient();

  const { symbol: symbolParam, view: viewParam } = await params;

  const symbol = symbolParam.toUpperCase();
  const view = viewParam.charAt(0).toUpperCase() + viewParam.slice(1);

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("symbol", symbol)
    .single();

  const companyName = profile?.company_name || symbol;
  const title = `${companyName} (${symbol}) - ${view} | Tickered`;
  const description = `View and analyze the latest ${view.toLowerCase()} data for ${companyName} (${symbol}) on Tickered.`;

  return {
    title,
    description,
  };
}

// 2. PAGE COMPONENT
export default async function SymbolViewPage({ params }: SymbolPageProps) {
  const { symbol, view } = await params;

  // You would fetch the data needed for this specific view here
  // For example, fetch revenue data if view === 'revenue'
  // const data = await fetchDataForView(symbol, view);

  // if (!data) {
  //   notFound();
  // }

  const companyName = "Company Name Here"; // Fetch this as well

  // 3. PAGE-SPECIFIC STRUCTURED DATA (BREADCRUMBS)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Workspace",
        item: `${process.env.NEXT_PUBLIC_BASE_URL}/workspace`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${companyName} (${symbol.toUpperCase()})`,
        item: `${process.env.NEXT_PUBLIC_BASE_URL}/workspace/${symbol}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: view.charAt(0).toUpperCase() + view.slice(1),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">{`${companyName} (${symbol.toUpperCase()})`}</h1>

        {/* You would have a tab component here to switch between views */}
        {/* <SymbolViewTabs activeView={view} symbol={symbol} /> */}

        <div className="mt-6">
          {/*
            Here you would render the specific, expanded content for the view.
            For example, if view is 'revenue', you'd render an expanded version
            of your RevenueCardContent component.
          */}
          <p>
            Displaying expanded content for: <strong>{view}</strong>
          </p>
        </div>
      </div>
    </>
  );
}
