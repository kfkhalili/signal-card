import { CheckCircle } from "lucide-react";

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
          <h2 className="text-2xl font-bold">Live Status Page Coming Soon</h2>
          <p className="text-muted-foreground mt-2">
            This is a placeholder page. A live status page with real-time
            monitoring and incident history will be implemented here.
          </p>
        </div>
      </main>
    </div>
  );
}
