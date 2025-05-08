
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DiscoveredSignal, PriceDiscoverySignal, PriceChangeSignal } from './types';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus, X } from 'lucide-react';

interface LogCardFaceProps {
  signal: DiscoveredSignal;
  isBack: boolean;
  onDelete?: (event: React.MouseEvent) => void;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ signal, isBack, onDelete }) => {
  const renderFrontContent = () => {
    let content;
    if (signal.type === 'price_discovery') {
      const discoverySignal = signal as PriceDiscoverySignal;
      content = (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{discoverySignal.symbol}</CardTitle>
            <CardDescription>Price</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${discoverySignal.price.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(discoverySignal.timestamp), 'PP p')}
            </p>
          </CardContent>
        </>
      );
    } else if (signal.type === 'price_change') {
      const changeSignal = signal as PriceChangeSignal;
      const priceDiff = changeSignal.price2 - changeSignal.price1;
      const absPriceDiff = Math.abs(priceDiff);
      let TrendIcon = Minus;
      let trendColorClass = 'text-foreground'; 
      let trendText = 'FLAT';

      if (priceDiff > 0) {
        TrendIcon = ArrowUpRight;
        trendColorClass = 'text-green-600'; 
        trendText = 'INCREASE';
      } else if (priceDiff < 0) {
        TrendIcon = ArrowDownRight;
        trendColorClass = 'text-red-600';
        trendText = 'DECREASE';
      }
      content = (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{changeSignal.symbol}</CardTitle>
            <CardDescription>Price Change Signal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center ${trendColorClass} mb-1`}>
              <TrendIcon className="h-8 w-8 mr-2" />
              <p className="text-3xl font-bold">${absPriceDiff.toFixed(2)}</p>
            </div>
            <p className={`text-lg font-semibold ${trendColorClass}`}>{trendText}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(changeSignal.timestamp1), 'p')} &rarr; {format(new Date(changeSignal.timestamp2), 'p')}
            </p>
          </CardContent>
        </>
      );
    } else {
      content = (
        <CardContent>
          <p>Unknown signal type.</p>
          <pre className="text-xs">{JSON.stringify(signal, null, 2)}</pre>
        </CardContent>
      );
    }

    return (
      <>
        {content}
        {onDelete && !isBack && ( // Show delete button only on the front face
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover/logcard:opacity-100 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-destructive z-10"
            onClick={onDelete}
            aria-label="Delete signal"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </>
    );
  };

  const renderBackContent = () => {
    if (signal.type === 'price_discovery') {
      const discoverySignal = signal as PriceDiscoverySignal;
      const explanation = `${discoverySignal.symbol}'s stock price was $${discoverySignal.price.toFixed(2)} at ${format(new Date(discoverySignal.timestamp), 'p \'on\' PP')}. This price point was logged on ${format(new Date(discoverySignal.discoveredAt), 'PP p')}.`;
      return (
        <>
          <CardHeader>
            <CardTitle className="text-lg">{discoverySignal.symbol} Price Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{explanation}</p>
          </CardContent>
        </>
      );
    } else if (signal.type === 'price_change') {
      const changeSignal = signal as PriceChangeSignal;
      const priceDiff = changeSignal.price2 - changeSignal.price1;
      const absPriceDiff = Math.abs(priceDiff);
      let trendText = 'remained flat';
      if (priceDiff > 0) trendText = `increased by $${absPriceDiff.toFixed(2)}`;
      else if (priceDiff < 0) trendText = `decreased by $${absPriceDiff.toFixed(2)}`;

      const explanation = `The price for ${changeSignal.symbol} ${trendText}, from $${changeSignal.price1.toFixed(2)} (at ${format(new Date(changeSignal.timestamp1), 'p')}) to $${changeSignal.price2.toFixed(2)} (at ${format(new Date(changeSignal.timestamp2), 'p')}). This signal was generated on ${format(new Date(changeSignal.generatedAt), 'PP p')}.`;
      return (
        <>
          <CardHeader>
            <CardTitle className="text-lg">{changeSignal.symbol} Price Change Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{explanation}</p>
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
    <Card className={`card-face ${isBack ? 'card-back' : 'card-front'} h-full flex flex-col shadow-lg relative`}>
      <div className="flex-grow overflow-y-auto">
        {isBack ? renderBackContent() : renderFrontContent()}
      </div>
    </Card>
  );
};

export default LogCardFace;
