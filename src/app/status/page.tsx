import type { Metadata } from "next";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "System Status - Tickered Financial Data Platform",
  description:
    "Check the current operational status of Tickered's financial data API, real-time market feeds, and enterprise market services. Monitor uptime and service availability.",
  alternates: {
    canonical: "/status",
  },
  openGraph: {
    title: "System Status - Tickered",
    description:
      "Check the current operational status of Tickered's financial data API and real-time market feeds.",
    type: "website",
    url: "/status",
  },
  twitter: {
    card: "summary",
    title: "System Status - Tickered",
    description:
      "Check the current operational status of Tickered's financial data API and real-time market feeds.",
  },
};

export default function StatusPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            System Status
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Current status of all Tickered services.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Web Application</h3>
              <div className="flex items-center space-x-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <span>Operational</span>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">API Services</h3>
              <div className="flex items-center space-x-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <span>Operational</span>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Real-time Data Feeds</h3>
              <div className="flex items-center space-x-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <span>Operational</span>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Database Services</h3>
              <div className="flex items-center space-x-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <span>Operational</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground mt-2">
            All systems are operational. For detailed incident history and real-time monitoring, please contact our support team.
          </p>
        </div>
      </main>
    </div>
  );
}
