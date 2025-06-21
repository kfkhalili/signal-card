import { Shield, Zap, BarChart3, Users } from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Features Built for Modern Investors
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Discover how Tickered transforms complex financial data into an
            interactive, digestible, and powerful experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Real-time Data</h3>
            </div>
            <p className="text-muted-foreground">
              This page will detail the real-time data capabilities of Tickered,
              including live market data, financial information updates, and the
              technology that powers it.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Dual Audience Focus</h3>
            </div>
            <p className="text-muted-foreground">
              This section will explain how Tickered is designed to be both
              simple enough for beginners and powerful enough for professional
              investors, with features tailored to each audience.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Secure & Reliable</h3>
            </div>
            <p className="text-muted-foreground">
              Here, we&apos;ll outline the enterprise-grade security, data
              privacy measures, and high uptime that make Tickered a trustworthy
              platform for your financial analysis.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center space-x-4 mb-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Interactive Cards</h3>
            </div>
            <p className="text-muted-foreground">
              A deep dive into our core &quot;Card&quot; system. This will
              showcase the different card types, how they are interactive, and
              how users can build their own dashboards.
            </p>
          </div>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold">Content Coming Soon</h2>
          <p className="text-muted-foreground mt-2">
            This page is currently under construction. More detailed feature
            descriptions and visuals will be added shortly.
          </p>
        </div>
      </main>
    </div>
  );
}
