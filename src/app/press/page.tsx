import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PressPage() {
  return (
    <div className="bg-background text-foreground">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Press & Media
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Resources for journalists, bloggers, and media professionals.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-card p-8 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground">
              Tickered was founded to make financial data accessible and
              intuitive for everyone. This section will contain our official
              company bio, mission statement, and information about our
              founders.
            </p>
          </div>
          <div className="bg-card p-8 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">Press Kit</h2>
            <p className="text-muted-foreground mb-6">
              Download our official press kit, which includes logos, brand
              guidelines, and product screenshots.
            </p>
            <Button>
              <Download className="mr-2 h-4 w-4" /> Download Press Kit
            </Button>
          </div>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold">Content Coming Soon</h2>
          <p className="text-muted-foreground mt-2">
            This page is currently under construction.
          </p>
        </div>
      </main>
    </div>
  );
}
