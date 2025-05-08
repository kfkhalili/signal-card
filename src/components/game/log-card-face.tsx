import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
// Removed Button, Badge, X icon from here as they will be in LogCard
import type { DiscoveredCard, PriceDiscoverySignal, PriceChangeSignal } from './types'; 
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'; // Kept for trend indication

interface LogCardFaceProps {
  card: DiscoveredCard; 
  isBack: boolean;
  // Removed onDelete, as the button will be handled by LogCard itself
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ card, isBack }) => { 
  const renderFrontContent = () => {
    if (card.type === 'price_discovery') {
      const discoveryCard = card as PriceDiscoverySignal;
      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{discoveryCard.symbol}</CardTitle>
            <CardDescription>Price</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${discoveryCard.price.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(discoveryCard.timestamp), "PP 'at' p")}
            </p>
          </CardContent>
        </>
      );
    } else if (card.type === 'price_change') {
      const changeCard = card as PriceChangeSignal;
      const priceDiff = changeCard.price2 - changeCard.price1;
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
      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{changeCard.symbol}</CardTitle>
            <CardDescription>Price Change Signal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center ${trendColorClass} mb-1`}>
              <TrendIcon className="h-8 w-8 mr-2" />
              <p className="text-3xl font-bold">${absPriceDiff.toFixed(2)}</p>
            </div>
            <p className={`text-lg font-semibold ${trendColorClass}`}>{trendText}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(changeCard.timestamp1), 'p')} &rarr; {format(new Date(changeCard.timestamp2), 'p')}
            </p>
          </CardContent>
        </>
      );
    }
    return (
      <CardContent>
        <p>Unknown card type.</p> 
        <pre className="text-xs">{JSON.stringify(card, null, 2)}</pre>
      </CardContent>
    );
  };

  const renderBackContent = () => {
    if (card.type === 'price_discovery') {
      const discoveryCard = card as PriceDiscoverySignal;
      const explanation = `${discoveryCard.symbol}'s stock price was $${discoveryCard.price.toFixed(2)} at ${format(new Date(discoveryCard.timestamp), "p 'on' PP")}. This price point was logged on ${format(new Date(discoveryCard.discoveredAt), "PP 'at' p")}.`;
      return (
        <>
          <CardHeader>
            <CardTitle className="text-lg">{discoveryCard.symbol} Price Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{explanation}</p>
          </CardContent>
        </>
      );
    } else if (card.type === 'price_change') {
      const changeCard = card as PriceChangeSignal;
      const priceDiff = changeCard.price2 - changeCard.price1;
      const absPriceDiff = Math.abs(priceDiff);
      let trendText = 'remained flat';
      if (priceDiff > 0) trendText = `increased by $${absPriceDiff.toFixed(2)}`;
      else if (priceDiff < 0) trendText = `decreased by $${absPriceDiff.toFixed(2)}`;

      const explanation = `The price for ${changeCard.symbol} ${trendText}, from $${changeCard.price1.toFixed(2)} (at ${format(new Date(changeCard.timestamp1), 'p')}) to $${changeCard.price2.toFixed(2)} (at ${format(new Date(changeCard.timestamp2), 'p')}). This signal was generated on ${format(new Date(changeCard.generatedAt), "PP 'at' p")}.`;
      return (
        <>
          <CardHeader>
            <CardTitle className="text-lg">{changeCard.symbol} Price Change Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{explanation}</p>
          </CardContent>
        </>
      );
    }
    return (
      <CardContent>
        <p>Unknown card type (back).</p>
        <pre className="text-xs">{JSON.stringify(card, null, 2)}</pre>
      </CardContent>
    );
  };

  // Return a fragment, not the full Card component
  return (
    <>
      {isBack ? renderBackContent() : renderFrontContent()}
    </>
  );
};

export default LogCardFace;