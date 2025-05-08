import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PriceGameCard, TrendGameCard, ActiveGameCard } from './types';
import { format } from 'date-fns';

interface CardFaceProps {
  card: ActiveGameCard;
  isBack: boolean;
  onExamine?: (card: PriceGameCard) => void;
  remainingTime?: string | null;
}

const CardFace: React.FC<CardFaceProps> = ({ card, isBack, onExamine, remainingTime }) => {
  const renderContent = () => {
    if (card.type === 'price') {
      const priceCard = card as PriceGameCard;
      if (isBack) {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg">{priceCard.faceData.symbol} Price Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{priceCard.backData.explanation}</p>
            </CardContent>
            {priceCard.isSecured && onExamine && (
              <CardFooter>
                <Button onClick={() => onExamine(priceCard)} className="w-full">
                  Check Trend vs. Previous Price
                </Button>
              </CardFooter>
            )}
          </>
        );
      } else {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{priceCard.faceData.symbol}</CardTitle>
              <CardDescription>Price</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${priceCard.faceData.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(priceCard.faceData.timestamp), 'PP p')}
              </p>
              <div className="mt-2 h-5"> {/* Container for timer or placeholder */}
                {remainingTime && !priceCard.isSecured ? (
                  <p className="text-sm text-accent font-medium animate-pulse">
                    Expires in: {remainingTime}
                  </p>
                ) : null } {/* Content is empty if timer not active, div reserves space */}
              </div>
            </CardContent>
          </>
        );
      }
    } else if (card.type === 'trend') {
      const trendCard = card as TrendGameCard;
       if (isBack) {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg">Trend Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{trendCard.backData.explanation}</p>
            </CardContent>
          </>
        );
      } else {
        let trendColorClass = 'text-foreground'; // Default color from theme
        if (trendCard.faceData.trend === 'UP') trendColorClass = 'text-green-600'; // Explicit color for UP
        if (trendCard.faceData.trend === 'DOWN') trendColorClass = 'text-red-600'; // Explicit color for DOWN
        
        return (
          <>
            <CardHeader>
              <CardTitle className="text-xl">{trendCard.faceData.symbol}</CardTitle>
              <CardDescription>Price Trend (5-min)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${trendColorClass}`}>{trendCard.faceData.trend}</p>
               <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(trendCard.faceData.referenceTimeStart), 'p')} - {format(new Date(trendCard.faceData.referenceTimeEnd), 'p')}
              </p>
            </CardContent>
          </>
        );
      }
    }
    return null;
  };

  return (
    <Card className={`card-face ${isBack ? 'card-back' : 'card-front'} h-full flex flex-col justify-between shadow-lg`}>
      {renderContent()}
    </Card>
  );
};

export default CardFace;
