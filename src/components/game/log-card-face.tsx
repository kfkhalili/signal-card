import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { DiscoveredSignal, PriceDiscoverySignal, PriceChangeSignal } from './types';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface LogCardFaceProps {
  signal: DiscoveredSignal;
  isBack: boolean;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ signal, isBack }) => {
  const renderContent = () => {
    if (signal.type === 'price_discovery') {
      const discoverySignal = signal as PriceDiscoverySignal;
      if (isBack) {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg">{discoverySignal.symbol} Price Revealed</CardTitle>
              <CardDescription>Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-semibold">Price: ${discoverySignal.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Data Timestamp: {format(new Date(discoverySignal.timestamp), 'PP p')}
              </p>
              <p className="text-xs text-muted-foreground">
                Discovered: {format(new Date(discoverySignal.discoveredAt), 'PP p')}
              </p>
            </CardContent>
          </>
        );
      } else {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{discoverySignal.symbol}</CardTitle>
              <CardDescription>Price Revealed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${discoverySignal.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                At: {format(new Date(discoverySignal.timestamp), 'PP p')}
              </p>
            </CardContent>
          </>
        );
      }
    } else if (signal.type === 'price_change') {
      const changeSignal = signal as PriceChangeSignal;
      const priceDiff = changeSignal.price2 - changeSignal.price1;
      const absPriceDiff = Math.abs(priceDiff);
      let TrendIcon = Minus;
      let trendColor = 'text-foreground';
      let trendText = 'FLAT';

      if (priceDiff > 0) {
        TrendIcon = ArrowUpRight;
        trendColor = 'text-green-600';
        trendText = 'INCREASE';
      } else if (priceDiff < 0) {
        TrendIcon = ArrowDownRight;
        trendColor = 'text-red-600';
        trendText = 'DECREASE';
      }

      if (isBack) {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg">{changeSignal.symbol} Price Change</CardTitle>
              <CardDescription>Detailed Report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Price {trendText} by ${absPriceDiff.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                From ${changeSignal.price1.toFixed(2)} ({format(new Date(changeSignal.timestamp1), 'p')})
              </p>
              <p className="text-xs text-muted-foreground">
                To ${changeSignal.price2.toFixed(2)} ({format(new Date(changeSignal.timestamp2), 'p')})
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Signal Generated: {format(new Date(changeSignal.generatedAt), 'PP p')}
              </p>
            </CardContent>
          </>
        );
      } else {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{changeSignal.symbol}</CardTitle>
              <CardDescription>Price Change Signal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center ${trendColor} mb-1`}>
                <TrendIcon className="h-8 w-8 mr-2" />
                <p className="text-3xl font-bold">${absPriceDiff.toFixed(2)}</p>
              </div>
              <p className={`text-lg font-semibold ${trendColor}`}>{trendText}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(changeSignal.timestamp1), 'p')} &rarr; {format(new Date(changeSignal.timestamp2), 'p')}
              </p>
            </CardContent>
          </>
        );
      }
    }
    return ( // Fallback for unknown signal types
        <CardContent>
            <p>Unknown signal type.</p>
            <pre className="text-xs">{JSON.stringify(signal, null, 2)}</pre>
        </CardContent>
    );
  };

  return (
    <Card className={`card-face ${isBack ? 'card-back' : 'card-front'} h-full flex flex-col justify-between shadow-lg`}>
      {renderContent()}
    </Card>
  );
};

export default LogCardFace;
