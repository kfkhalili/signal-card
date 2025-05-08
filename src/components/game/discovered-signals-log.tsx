import React, { useState, useEffect, useMemo } from 'react';
import type { DiscoveredSignal } from './types';
import { Card as ShadCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Renamed to avoid conflict
import { ScrollArea } from '@/components/ui/scroll-area';
import LogCard from './log-card'; // Import the new LogCard component

interface DiscoveredSignalsLogProps {
  signals: DiscoveredSignal[];
  onToggleFlipSignal: (signalId: string) => void;
  onDeleteSignal: (signalId: string) => void;
}

const DiscoveredSignalsLog: React.FC<DiscoveredSignalsLogProps> = ({ signals, onToggleFlipSignal, onDeleteSignal }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const reversedSignals = useMemo(() => {
    // Create a new array from signals before reversing, as reverse is in-place.
    return [...signals].reverse();
  }, [signals]);

  if (!hasMounted) {
    return (
      <ShadCard className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground">Discovered Signals Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading signals...</p>
        </CardContent>
      </ShadCard>
    );
  }

  return (
    <ShadCard className="mt-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">Discovered Signals Log</CardTitle>
      </CardHeader>
      <CardContent>
        {reversedSignals.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No signals discovered yet. Secure Price Cards or combine them to generate signals.</p>
        ) : (
          <ScrollArea className="h-[400px] lg:h-[450px] pr-4"> {/* Adjusted height for cards + potential footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-4">
              {reversedSignals.map((signal) => (
                <LogCard
                  key={signal.id}
                  signal={signal}
                  onToggleFlip={onToggleFlipSignal}
                  onDeleteSignal={onDeleteSignal}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </ShadCard>
  );
};

export default DiscoveredSignalsLog;