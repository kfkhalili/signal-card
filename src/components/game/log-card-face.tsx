
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DiscoveredCard, PriceDiscoverySignal, PriceChangeSignal } from './types'; 
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


interface LogCardFaceProps {
  card: DiscoveredCard; 
  isBack: boolean;
  onDelete?: (event: React.MouseEvent) => void;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ card, isBack, onDelete }) => { 
  const renderFrontContent = () => {
    let content;
    const isNewAndUnflipped = card.hasBeenFlippedAtLeastOnce === false;

    if (card.type === 'price_discovery') {
      const discoveryCard = card as PriceDiscoverySignal; 
      content = (
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
      content = (
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
    } else {
      content = (
        <CardContent>
          <p>Unknown card type.</p> 
          <pre className="text-xs">{JSON.stringify(card, null, 2)}</pre> 
        </CardContent>
      );
    }

    return (
      <>
        {content}
        
        {/* Container for X button and NEW badge in top-right */}
        {(!isBack && (onDelete || isNewAndUnflipped)) && (
          <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
            {/* Delete Button: appears on hover */}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-destructive opacity-0 group-hover/logcard:opacity-100 transition-opacity"
                onClick={onDelete}
                aria-label="Delete card" 
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* NEW Badge: visible if new and unflipped */}
            {isNewAndUnflipped && (
              <Badge variant="default" className="text-xs px-1.5 py-0.5 h-5">
                NEW
              </Badge>
            )}
          </div>
        )}
      </>
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

  return (
    <Card className={`card-face ${isBack ? 'card-back' : 'card-front'} h-full flex flex-col shadow-lg relative`}>
      <div className="flex-grow overflow-y-auto">
        {isBack ? renderBackContent() : renderFrontContent()}
      </div>
    </Card>
  );
};

export default LogCardFace;

