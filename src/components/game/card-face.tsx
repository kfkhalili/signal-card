import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Removed Card, CardFooter, Button
import type { PriceGameCard, TrendGameCard, ActiveGameCard } from './types';
import { format } from 'date-fns';

interface CardFaceProps {
  card: ActiveGameCard;
  isBack: boolean;
  // Removed onExamine and remainingTime props
}

const CardFace: React.FC<CardFaceProps> = ({ card, isBack }) => {
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
            {/* Removed Examine button and CardFooter */}
          </>
        );
      } else { // Front of Price Card
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
              {/* Removed timer display div */}
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
      } else { // Front of Trend Card
        let trendColorClass = 'text-foreground';
        if (trendCard.faceData.trend === 'UP') trendColorClass = 'text-green-600';
        if (trendCard.faceData.trend === 'DOWN') trendColorClass = 'text-red-600';
        
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

  // Return a fragment, not the full Card component
  return (
    <>
      {renderContent()}
    </>
  );
};

export default CardFace;