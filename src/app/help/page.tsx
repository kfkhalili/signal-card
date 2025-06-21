import { LifeBuoy, BookOpen, MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HelpPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Help Center
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            How can we help you? Find answers to your questions below.
          </p>
          <div className="mt-6 max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for help..." className="pl-10" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-center">
          <div className="bg-card p-8 rounded-lg border">
            <LifeBuoy className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Getting Started</h3>
            <p className="text-muted-foreground">
              This section will guide new users through the initial setup and
              basic features of Tickered.
            </p>
          </div>
          <div className="bg-card p-8 rounded-lg border">
            <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Guides & Tutorials</h3>
            <p className="text-muted-foreground">
              Here you&apos;ll find detailed guides on using advanced features,
              interpreting data, and getting the most out of the platform.
            </p>
          </div>
          <div className="bg-card p-8 rounded-lg border">
            <MessageSquare className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Contact Support</h3>
            <p className="text-muted-foreground">
              This area will provide information on how to contact our support
              team for personalized assistance.
            </p>
          </div>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold">Content Coming Soon</h2>
          <p className="text-muted-foreground mt-2">
            Our Help Center is currently under construction.
          </p>
        </div>
      </main>
    </div>
  );
}
