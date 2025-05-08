
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DiscoveredSignal, PriceDiscoverySignal, PriceChangeSignal } from './types';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus, Trash2 } from 'lucide-react';

interface LogCardFaceProps {
  signal: DiscoveredSignal;
  isBack: boolean;
  onDelete?: (event: React.MouseEvent) => void;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ signal, isBack, onDelete }) => {
  const renderFrontContent = () => {
    if (signal.type === 'price_discovery') {
      const discoverySignal = signal as PriceDiscoverySignal;
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
    } else if (signal.type === 'price_change') {
      const changeSignal = signal as PriceChangeSignal;
      const priceDiff = changeSignal.price2 - changeSignal.price1;
      const absPriceDiff = Math.abs(priceDiff);
      let TrendIcon = Minus;
      let trendColor = 'text-foreground';
      let trendText = 'FLAT';

      if (priceDiff > 0) {
        TrendIcon = ArrowUpRight;
        trendColor = 'text-green-600'; // Ensure this class exists or use theme-based colors
        trendText = 'INCREASE';
      } else if (priceDiff < 0) {
        TrendIcon = ArrowDownRight;
        trendColor = 'text-red-600'; // Ensure this class exists or use theme-based colors
        trendText = 'DECREASE';
      }
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
    return (
      <CardContent>
        <p>Unknown signal type.</p>
        <pre className="text-xs">{JSON.stringify(signal, null, 2)}</pre>
      </CardContent>
    );
  };

  const renderBackContent = () => {
    if (signal.type === 'price_discovery') {
      const discoverySignal = signal as PriceDiscoverySignal;
      return (
        <>
          <CardHeader>
            <CardTitle className="text-lg">{discoverySignal.symbol} Price Revealed</CardTitle>
            <CardDescription>Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">Price: ${discoverySignal.price.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Data Timestamp: {format(new Date(discoverySignal.timestamp), 'PP p')}
            </p>
            <p className="text-xs text-muted-foreground">
              Discovered: {format(new Date(discoverySignal.discoveredAt), 'PP p')}
            </p>
          </CardContent>
        </>
      );
    } else if (signal.type === 'price_change') {
      const changeSignal = signal as PriceChangeSignal;
      const priceDiff = changeSignal.price2 - changeSignal.price1;
      const absPriceDiff = Math.abs(priceDiff);
      let trendText = 'FLAT';
      if (priceDiff > 0) trendText = 'INCREASE';
      else if (priceDiff < 0) trendText = 'DECREASE';

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
    }
    return (
      <CardContent>
        <p>Unknown signal type (back).</p>
        <pre className="text-xs">{JSON.stringify(signal, null, 2)}</pre>
      </CardContent>
    );
  };

  return (
    <Card className={`card-face ${isBack ? 'card-back' : 'card-front'} h-full flex flex-col shadow-lg`}>
      <div className="flex-grow overflow-y-auto"> {/* Make content scrollable if it overflows */}
        {isBack ? renderBackContent() : renderFrontContent()}
      </div>
      {isBack && onDelete && (
        <CardFooter className="pt-3 pb-3 border-t mt-auto">
          <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Signal
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default LogCardFace;
