import React from 'react';
import type { DiscoveredSignal, PriceChangeSignal, PriceDiscoverySignal } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface DiscoveredSignalsLogProps {
  signals: DiscoveredSignal[];
}

const DiscoveredSignalsLog: React.FC<DiscoveredSignalsLogProps> = ({ signals }) => {
  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Discovered Signals Log</CardTitle>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <p className="text-muted-foreground">No signals discovered yet. Secure Price Cards or combine them to generate signals.</p>
        ) : (
          <ScrollArea className="h-64 pr-4">
            <ul className="space-y-3">
              {signals.slice().reverse().map((signal) => {
                if (signal.type === 'price_discovery') {
                  const discoverySignal = signal as PriceDiscoverySignal;
                  return (
                    <li key={discoverySignal.id} className="p-3 bg-card border rounded-md shadow-sm hover:bg-secondary/20 transition-colors">
                      <p className="font-medium text-primary-foreground bg-primary px-2 py-1 rounded-t-md -mx-3 -mt-3 mb-2">
                        {discoverySignal.symbol} Price Revealed
                      </p>
                      <p className="text-foreground">
                        Price: ${discoverySignal.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Data Timestamp: {format(new Date(discoverySignal.timestamp), 'PP p')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Discovered: {format(new Date(discoverySignal.discoveredAt), 'PP p')}
                      </p>
                    </li>
                  );
                } else if (signal.type === 'price_change') {
                  const changeSignal = signal as PriceChangeSignal;
                  const priceDiff = changeSignal.price2 - changeSignal.price1;
                  const changeType = priceDiff > 0 ? "Increased" : priceDiff < 0 ? "Decreased" : "Remained Flat";
                  const amount = Math.abs(priceDiff).toFixed(2);
                  const time1Str = format(new Date(changeSignal.timestamp1), 'p');
                  const time2Str = format(new Date(changeSignal.timestamp2), 'p');

                  return (
                    <li key={changeSignal.id} className="p-3 bg-card border rounded-md shadow-sm hover:bg-secondary/20 transition-colors">
                      <p className="font-medium text-primary-foreground bg-primary px-2 py-1 rounded-t-md -mx-3 -mt-3 mb-2">
                        {changeSignal.symbol} Price Change
                      </p>
                      <p className="text-foreground">
                        {changeType} by ${amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Between {time1Str} (Price: ${changeSignal.price1.toFixed(2)}) and {time2Str} (Price: ${changeSignal.price2.toFixed(2)})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generated: {format(new Date(changeSignal.generatedAt), 'PP p')}
                      </p>
                    </li>
                  );
                }
                // Fallback for signals that might not have a 'type' property (e.g. from older localStorage)
                // or unhandled types. This attempts to render it as a PriceChangeSignal if possible.
                // For robustness, you might want to add more specific checks or a generic display.
                const changeSignal = signal as PriceChangeSignal; 
                if (changeSignal.price1 !== undefined && changeSignal.price2 !== undefined) {
                   const priceDiff = changeSignal.price2 - changeSignal.price1;
                    const changeType = priceDiff > 0 ? "Increased" : priceDiff < 0 ? "Decreased" : "Remained Flat";
                    const amount = Math.abs(priceDiff).toFixed(2);
                    const time1Str = format(new Date(changeSignal.timestamp1), 'p');
                    const time2Str = format(new Date(changeSignal.timestamp2), 'p');
                     return (
                        <li key={changeSignal.id} className="p-3 bg-card border rounded-md shadow-sm hover:bg-secondary/20 transition-colors">
                            <p className="font-medium text-primary-foreground bg-primary px-2 py-1 rounded-t-md -mx-3 -mt-3 mb-2">
                            {changeSignal.symbol || 'Unknown Symbol'} Price Change (Legacy)
                            </p>
                            <p className="text-foreground">
                            {changeType} by ${amount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                            Between {time1Str} (Price: ${changeSignal.price1.toFixed(2)}) and {time2Str} (Price: ${changeSignal.price2.toFixed(2)})
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                            Generated: {format(new Date(changeSignal.generatedAt), 'PP p')}
                            </p>
                        </li>
                    );
                }
                return (
                     <li key={signal.id || `unknown-${Math.random()}`} className="p-3 bg-card border rounded-md shadow-sm">
                        <p className="font-medium text-destructive-foreground bg-destructive px-2 py-1 rounded-t-md -mx-3 -mt-3 mb-2">
                            Unknown Signal Type
                        </p>
                        <p className="text-xs text-muted-foreground">ID: {signal.id}</p>
                    </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscoveredSignalsLog;
