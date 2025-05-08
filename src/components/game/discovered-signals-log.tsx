import React from 'react';
import type { PriceChangeSignal } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface DiscoveredSignalsLogProps {
  signals: PriceChangeSignal[];
}

const DiscoveredSignalsLog: React.FC<DiscoveredSignalsLogProps> = ({ signals }) => {
  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Discovered Signals Log</CardTitle>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <p className="text-muted-foreground">No signals discovered yet. Combine Price Cards to generate signals.</p>
        ) : (
          <ScrollArea className="h-64 pr-4">
            <ul className="space-y-3">
              {signals.slice().reverse().map((signal) => {
                const priceDiff = signal.price2 - signal.price1;
                const changeType = priceDiff > 0 ? "Increased" : priceDiff < 0 ? "Decreased" : "Remained Flat";
                const amount = Math.abs(priceDiff).toFixed(2);
                const time1Str = format(signal.timestamp1, 'p');
                const time2Str = format(signal.timestamp2, 'p');

                return (
                  <li key={signal.id} className="p-3 bg-card border rounded-md shadow-sm hover:bg-secondary/20 transition-colors">
                    <p className="font-medium text-primary-foreground bg-primary px-2 py-1 rounded-t-md -mx-3 -mt-3 mb-2">
                      {signal.symbol} Price Change
                    </p>
                    <p className="text-foreground">
                      {changeType} by ${amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Between {time1Str} (Price: ${signal.price1.toFixed(2)}) and {time2Str} (Price: ${signal.price2.toFixed(2)})
                    </p>
                     <p className="text-xs text-muted-foreground mt-1">
                      Generated: {format(signal.generatedAt, 'PP p')}
                    </p>
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
