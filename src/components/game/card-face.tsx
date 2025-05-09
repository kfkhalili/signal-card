import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { PriceGameCard, TrendGameCard, ActiveGameCard, PriceCardFaceData, PriceCardBackData } from './types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CardFaceProps {
  card: ActiveGameCard;
  isBack: boolean;
  onSmaClick?: (smaPeriod: 50 | 200, smaValue: number, faceData: PriceCardFaceData) => void;
}

const formatMarketCap = (cap: number | null | undefined): string => {
  if (cap === null || cap === undefined) return 'N/A';
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toString();
};

const CardFace: React.FC<CardFaceProps> = ({ card, isBack, onSmaClick }) => {
  if (isBack && card.type === 'price') {
    console.log("CardFace (Back): onSmaClick prop is type:", typeof onSmaClick, "Is it a function?", onSmaClick !== undefined);
  }

  const handleBackFaceInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    smaPeriod: 50 | 200, 
    smaValue: number | null | undefined,
    faceData: PriceCardFaceData 
  ) => {
    if (onSmaClick && smaValue !== null && smaValue !== undefined) {
      console.log(`CardFace: SMA ${smaPeriod}D area clicked/keyed. Stopping propagation and calling onSmaClick.`);
      e.stopPropagation(); 
      onSmaClick(smaPeriod, smaValue, faceData);
    } else {
      console.log("CardFace: Click/key on back, but not a valid SMA or onSmaClick missing.");
    }
  };

  const renderContent = () => {
    if (card.type === 'price') {
      const priceCard = card as PriceGameCard;
      const faceData = priceCard.faceData as PriceCardFaceData;
      const backData = priceCard.backData as PriceCardBackData;

      if (isBack) {
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg">{faceData.symbol} - Details</CardTitle>
              <CardDescription>{backData.explanation || 'Market Data & Technicals'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p><span className="font-semibold">Open:</span> ${faceData.dayOpen?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Prev Close:</span> ${faceData.previousClose?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Day High:</span> ${faceData.dayHigh?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Day Low:</span> ${faceData.dayLow?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Volume:</span> {faceData.volume?.toLocaleString() ?? 'N/A'}</p>
                <p><span className="font-semibold">Market Cap:</span> {formatMarketCap(backData.marketCap)}</p>
                
                <div 
                  className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma50d != null ? "cursor-pointer hover:bg-muted" : "")}
                  onClick={(e) => { if (onSmaClick && backData.sma50d != null) handleBackFaceInteraction(e, 50, backData.sma50d, faceData); }}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSmaClick && backData.sma50d != null) { handleBackFaceInteraction(e, 50, backData.sma50d, faceData); } }}
                  role={onSmaClick && backData.sma50d != null ? "button" : undefined}
                  tabIndex={onSmaClick && backData.sma50d != null ? 0 : undefined}
                >
                  <span className="font-semibold">50D SMA:</span> {backData.sma50d?.toFixed(2) ?? 'N/A'}
                </div>

                <div 
                  className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma200d != null ? "cursor-pointer hover:bg-muted" : "")}
                  onClick={(e) => { if (onSmaClick && backData.sma200d != null) handleBackFaceInteraction(e, 200, backData.sma200d, faceData); }}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSmaClick && backData.sma200d != null) { handleBackFaceInteraction(e, 200, backData.sma200d, faceData); } }}
                  role={onSmaClick && backData.sma200d != null ? "button" : undefined}
                  tabIndex={onSmaClick && backData.sma200d != null ? 0 : undefined}
                >
                  <span className="font-semibold">200D SMA:</span> ${backData.sma200d?.toFixed(2) ?? 'N/A'}
                </div>
              </div>
            </CardContent>
          </>
        );
      } else { // Front of Price Card
        const changePositive = faceData.dayChange !== null && faceData.dayChange !== undefined && faceData.dayChange >= 0;
        const changeColor = faceData.dayChange === 0 ? 'text-muted-foreground' : changePositive ? 'text-green-600' : 'text-red-600';

        return (
          <>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl">{faceData.symbol}</CardTitle>
                    <CardDescription>Live Quote</CardDescription>
                </div>
                <p className="text-xs text-muted-foreground">
                    {faceData.timestamp ? format(new Date(faceData.timestamp), 'p') : 'N/A'}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold mb-1">
                ${faceData.price !== null && faceData.price !== undefined ? faceData.price.toFixed(2) : 'N/A'}
              </p>
              <div className={cn("flex items-baseline space-x-2", changeColor)}>
                <p className="text-lg font-semibold">
                  {faceData.dayChange !== null && faceData.dayChange !== undefined ? `${changePositive ? '+' : ''}${faceData.dayChange.toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-lg font-semibold">
                  ({faceData.changePercentage !== null && faceData.changePercentage !== undefined ? `${changePositive ? '+' : ''}${(faceData.changePercentage * 100).toFixed(2)}%` : 'N/A'})
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Data as of: {faceData.timestamp ? format(new Date(faceData.timestamp), 'PP p') : 'N/A'}
              </p>
               {faceData.dayLow !== null && faceData.dayLow !== undefined && 
                faceData.dayHigh !== null && faceData.dayHigh !== undefined && 
                faceData.price !== null && faceData.price !== undefined && 
                faceData.dayHigh > faceData.dayLow && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>L: ${faceData.dayLow.toFixed(2)}</span>
                    <span>H: ${faceData.dayHigh.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={cn("h-1.5 rounded-full", changePositive ? 'bg-green-500' : 'bg-red-500')}
                      style={{
                        width: `${Math.max(0, Math.min(100, ((faceData.price - faceData.dayLow) / (faceData.dayHigh - faceData.dayLow)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </>
        );
      }
    } else if (card.type === 'trend') {
      const trendCard = card as TrendGameCard;
       if (isBack) { /* ... */ } else { /* ... */ }
    }
    return null;
  };

  return (
    <>
      {renderContent()}
    </>
  );
};

export default CardFace;
