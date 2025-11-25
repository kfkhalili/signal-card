import type { Metadata } from "next";
import { Code, Book, Key } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation - Tickered Financial Data API",
  description:
    "Integrate Tickered's institutional-grade financial data API into your applications. Access real-time market feeds, enterprise market services, and comprehensive financial data through our RESTful API.",
  alternates: {
    canonical: "/api",
  },
  openGraph: {
    title: "API Documentation - Tickered Financial Data API",
    description:
      "Integrate Tickered's institutional-grade financial data API into your applications. Access real-time market feeds and enterprise market services.",
    type: "website",
    url: "/api",
  },
  twitter: {
    card: "summary",
    title: "API Documentation - Tickered",
    description:
      "Integrate Tickered's institutional-grade financial data API into your applications. Access real-time market feeds and enterprise market services.",
  },
};

export default function ApiPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Tickered API Documentation
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Integrate Tickered&apos;s powerful financial data into your own
            applications.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card p-8 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">Overview</h2>
            <p className="text-muted-foreground mb-6">
              This page will provide comprehensive documentation for the
              Tickered API, which will be available to users on our Pro and
              Enterprise plans. The API will offer programmatic access to the
              same real-time financial data that powers our web application.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <Key className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-medium">Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Details on how to get your API key and authenticate
                    requests.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Code className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-medium">Endpoints</h4>
                  <p className="text-sm text-muted-foreground">
                    A full reference of all available API endpoints and their
                    parameters.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Book className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h4 className="font-medium">Examples</h4>
                  <p className="text-sm text-muted-foreground">
                    Code examples in various languages to get you started
                    quickly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground mt-2">
            API access is available for Pro and Enterprise plans. For API documentation, authentication details, and integration support, please contact{" "}
            <a href="mailto:support@tickered.com" className="text-primary hover:underline">
              support@tickered.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
