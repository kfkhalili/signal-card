// src/components/symbol-analysis/InstitutionalHoldingsCard.tsx
"use client";

import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InstitutionalHoldingsCard() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Landmark className="h-4 w-4" />
          Smart Money
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Landmark className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">Institutional Holdings</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Institutional holdings and smart money tracking data is available through our Enterprise API. Contact{" "}
            <a href="mailto:support@tickered.com" className="text-primary hover:underline">
              support@tickered.com
            </a>
            {" "}for access.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
